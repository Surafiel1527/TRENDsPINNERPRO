import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as https from "https";
import ytdl from "ytdl-core";
import * as ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fluentFfmpeg = require("fluent-ffmpeg");

// Initialize libraries
fluentFfmpeg.setFfmpegPath(ffmpegInstaller.path);
admin.initializeApp();
const db = admin.firestore();

interface Clip {
  start: number;
  end: number;
}

// --- B-Roll Finder (for suggestions) ---
// FIX: Declare secrets directly as strings in the options object
export const findBroll = onCall({ secrets: ["PEXELS_KEY", "PIXABAY_KEY", "GEMINI_KEY"] }, async (request) => {
  logger.info("findBroll function triggered.");
  const script = request.data.script;
  if (!script) {
    logger.error("Function failed: No script was provided.");
    throw new HttpsError("invalid-argument", "The function must be called with a 'script' argument.");
  }

  try {
    // 1. Get API Keys directly from process.env
    const pexelsApiKey = process.env.PEXELS_KEY;
    const pixabayApiKey = process.env.PIXABAY_KEY;
    const geminiApiKey = process.env.GEMINI_KEY;
    
    if (!pexelsApiKey || !pixabayApiKey || !geminiApiKey) {
        logger.error("One or more API keys are not defined in the environment.");
        throw new HttpsError("internal", "Server configuration error. Please ensure all API keys are set as secrets.");
    }
    logger.info("Successfully loaded API keys.");

    // 2. Use Gemini to extract keywords
    const geminiPrompt = `Analyze the following video script. Identify the main visual scenes or actions described. For each scene, extract a concise, searchable keyword phrase (2-4 words) suitable for a stock video API search. Return the result as a JSON array of strings. Do not return more than 3 keywords. Script: "${script}"`;
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: geminiPrompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        logger.error("Gemini API request failed.", {status: geminiResponse.status, body: errorBody});
        throw new HttpsError("internal", `Gemini API request failed with status ${geminiResponse.status}`);
    }

    const geminiResult = await geminiResponse.json();
    if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
      logger.error("Gemini API did not return valid candidates.", geminiResult);
      throw new HttpsError("internal", "Failed to analyze script with AI.");
    }

    const keywordsText = geminiResult.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
    const keywords = JSON.parse(keywordsText);
    logger.info("Found keywords:", keywords);

    // 3. Search both Pexels and Pixabay in parallel
    const pexelsPromises = keywords.map(async (keyword: string) => {
      const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`;
      const response = await fetch(url, { headers: { 'Authorization': pexelsApiKey } });
      const result = await response.json();
      if (result.videos && result.videos.length > 0) {
        const video = result.videos[0];
        return {
          id: `pexels-${video.id}`,
          keyword: keyword,
          source: 'Pexels',
          videoUrl: video.video_files.find((f: any) => f.quality === 'sd')?.link,
          user: video.user.name,
        };
      }
      return null;
    });

    const pixabayPromises = keywords.map(async (keyword: string) => {
      const url = `https://pixabay.com/api/videos/?key=${pixabayApiKey}&q=${encodeURIComponent(keyword)}&per_page=3&video_type=film&orientation=horizontal`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.hits && result.hits.length > 0) {
        const video = result.hits[0];
        return {
          id: `pixabay-${video.id}`,
          keyword: keyword,
          source: 'Pixabay',
          videoUrl: video.videos.medium.url,
          user: video.user,
        };
      }
      return null;
    });

    const allResults = await Promise.all([...pexelsPromises, ...pixabayPromises]);
    const finalResults = allResults.filter(result => result !== null);
    logger.info(`Found ${finalResults.length} total videos. Returning to client.`);
    return finalResults;

  } catch (error) {
    logger.error("An unhandled error occurred in findBroll:", error);
    throw new HttpsError("internal", "An unexpected error occurred while finding B-Roll.", error);
  }
});


// --- PREMIUM FUNCTION: Generate Video From Text ---
export const generateVideoFromText = onCall(
  { timeoutSeconds: 540, memory: "1GiB", secrets: ["PEXELS_KEY", "GEMINI_KEY"] },
  async (request) => {
    const { script, userId } = request.data;
    if (!script || !userId) {
      throw new HttpsError("invalid-argument", "Script and User ID must be provided.");
    }

    const userDocRef = db.collection("users").doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();

    const requiredCredits = 10;
    if (!userData || userData.videoCredits < requiredCredits) {
      throw new HttpsError("failed-precondition", "Insufficient credits to generate video.");
    }

    const pexelsApiKey = process.env.PEXELS_KEY;
    const geminiApiKey = process.env.GEMINI_KEY;

    if (!pexelsApiKey || !geminiApiKey) {
        logger.error("One or more API keys are not defined in the environment for generateVideoFromText.");
        throw new HttpsError("internal", "Server configuration error.");
    }

    const geminiPrompt = `Analyze this script and extract up to 5 searchable keyword phrases (2-4 words each) for stock video APIs. Return a JSON array of strings. Script: "${script}"`;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
        }),
    });
    const geminiResult = await geminiResponse.json();
    
    if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
        logger.error("Gemini API did not return valid candidates for video generation.", geminiResult);
        throw new HttpsError("internal", "Failed to analyze script with AI for video generation.");
    }

    const keywordsText = geminiResult.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
    const keywords = JSON.parse(keywordsText);

    const searchPromises = keywords.map(async (keyword: string) => {
        const pexelsUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=1&orientation=landscape`;
        const pexelsRes = await fetch(pexelsUrl, { headers: { 'Authorization': pexelsApiKey } });
        const pexelsResult = await pexelsRes.json();
        if (pexelsResult.videos && pexelsResult.videos.length > 0) {
            return pexelsResult.videos[0].video_files.find((f: any) => f.quality === 'sd')?.link;
        }
        return null;
    });
    const videoUrls = (await Promise.all(searchPromises)).filter((url): url is string => url !== null);
    
    if (videoUrls.length === 0) {
        throw new HttpsError("not-found", "Could not find any suitable B-roll for the script.");
    }

    const tempFilePaths: string[] = [];
    const downloadPromises = videoUrls.map((url, index) => {
        const tempPath = path.join(os.tmpdir(), `clip_${index}.mp4`);
        tempFilePaths.push(tempPath);
        return new Promise<void>((resolve, reject) => {
            https.get(url, (response) => {
                const stream = fs.createWriteStream(tempPath);
                response.pipe(stream);
                stream.on('finish', resolve);
                stream.on('error', reject);
            }).on('error', reject);
        });
    });
    await Promise.all(downloadPromises);

    const command = fluentFfmpeg();
    tempFilePaths.forEach(p => command.input(p));
    
    const jobId = `text_gen_${Date.now()}`;
    const tempOutputPath = path.join(os.tmpdir(), `processed_${jobId}.mp4`);

    await new Promise<void>((resolve, reject) => {
        command
          .on('error', (err) => reject(new Error("FFmpeg merge failed: " + err.message)))
          .on('end', () => resolve())
          .mergeToFile(tempOutputPath, os.tmpdir());
    });

    const bucket = getStorage().bucket();
    const outputFilePath = `processed/${userId}/${jobId}.mp4`;
    await bucket.upload(tempOutputPath, { destination: outputFilePath, metadata: { contentType: "video/mp4" } });
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const downloadUrl = (await bucket.file(outputFilePath).getSignedUrl({ action: "read", expires: tomorrow.toISOString() }))[0];

    await userDocRef.update({ videoCredits: admin.firestore.FieldValue.increment(-requiredCredits) });
    
    tempFilePaths.forEach(p => fs.unlinkSync(p));
    fs.unlinkSync(tempOutputPath);

    return { downloadUrl, creditsUsed: requiredCredits };
  }
);


// --- ORIGINAL FUNCTION: Video Processor ---
export const processVideoJob = onDocumentCreated(
  {
    document: "users/{userId}/videoJobs/{jobId}",
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.log("No data associated with the event.");
      return;
    }

    const jobData = snap.data();
    const {userId, jobId} = event.params;

    const jobRef = db.collection("users").doc(userId)
      .collection("videoJobs").doc(jobId);

    const tempRawPath = path.join(os.tmpdir(), `raw_${jobId}`);
    const tempOutputPath = path.join(os.tmpdir(), `processed_${jobId}.mp4`);

    try {
      await jobRef.update({status: "processing"});
      const bucket = getStorage().bucket();

      if (jobData.status === "uploaded") {
        await bucket.file(jobData.rawFilePath)
          .download({destination: tempRawPath});
      } else if (jobData.status === "pending_download") {
        await new Promise((resolve, reject) => {
          const stream = ytdl(jobData.urlToProcess, {
            filter: "audioandvideo",
          });
          const writeStream = fs.createWriteStream(tempRawPath);
          stream.pipe(writeStream);
          stream.on("end", resolve);
          stream.on("error", reject);
        });
      } else {
        throw new Error(`Invalid initial job status: ${jobData.status}`);
      }

      const clipsToProcess: Clip[] = jobData.clips;

      if (!clipsToProcess || clipsToProcess.length === 0) {
        throw new Error("No clips were defined for processing.");
      }

      const complexFilter = [
        ...clipsToProcess.flatMap((clip: Clip, index: number) => [
          `[0:v]trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS[v${index}]`,
          `[0:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS[a${index}]`,
        ]),
        `${clipsToProcess.map((_: Clip, i: number) => `[v${i}][a${i}]`).join("")}` +
        `concat=n=${clipsToProcess.length}:v=1:a=1[v][a]`,
      ];

      await new Promise<void>((resolve, reject) => {
        fluentFfmpeg(tempRawPath)
          .complexFilter(complexFilter, ["[v]", "[a]"])
          .outputOptions("-vsync", "vfr")
          .on("end", () => {
            logger.log("FFmpeg processing finished successfully.");
            resolve();
          })
          .on("error", (err: Error) => {
            logger.error("FFmpeg processing failed:", err);
            reject(new Error("FFmpeg processing failed: " + err.message));
          })
          .save(tempOutputPath);
      });

      const outputFilePath = `processed/${userId}/${jobId}.mp4`;
      await bucket.upload(tempOutputPath, {
        destination: outputFilePath,
        metadata: {contentType: "video/mp4"},
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const downloadUrl = (await bucket.file(outputFilePath).getSignedUrl({
        action: "read",
        expires: tomorrow.toISOString(),
      }))[0];

      await jobRef.update({status: "complete", processedFileUrl: downloadUrl});
      logger.log(`Job ${jobId} completed successfully.`);
    } catch (error) {
      const errorMessage = error instanceof Error ?
        error.message : "An unknown error occurred.";
      logger.error(`Job ${jobId} failed.`, {error: errorMessage});
      await jobRef.update({status: "failed", error: errorMessage});
    } finally {
      if (fs.existsSync(tempRawPath)) fs.unlinkSync(tempRawPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    }
  },
);
