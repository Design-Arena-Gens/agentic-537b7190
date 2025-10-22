import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().min(8),
  style: z.string().min(3),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  duration: z.number().min(4).max(24),
});

const REPLICATE_MODEL_VERSION =
  "1e205ea73084bd17a0a3b43396e49ba0d6bc2e754e9283b2df49fad2dcf95755";

const fallbackVideoUrl =
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { prompt, style, aspectRatio, duration } = requestSchema.parse(json);

    const token = process.env.REPLICATE_API_TOKEN;

    if (!token) {
      return NextResponse.json({
        status: "mock",
        videoUrl: fallbackVideoUrl,
        message:
          "Set the REPLICATE_API_TOKEN environment variable to generate bespoke footage. Showing a sample cinematic reel instead.",
      });
    }

    const numFrames = Math.min(Math.floor(duration * 8), 160);

    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: {
          prompt: `${prompt} | style: ${style} | aspect ratio: ${aspectRatio}`,
          num_frames: numFrames,
        },
      }),
    });

    if (!createResponse.ok) {
      const errorPayload = await createResponse.json().catch(() => null);
      return NextResponse.json(
        {
          status: "failed",
          message:
            errorPayload?.detail ??
            "Failed to create prediction with Replicate. Verify API token and prompt validity.",
        },
        { status: 200 }
      );
    }

    let prediction = await createResponse.json();

    const timeoutMs = 55000;
    const start = Date.now();

    while (
      prediction.status === "starting" || prediction.status === "processing"
    ) {
      if (Date.now() - start > timeoutMs) {
        return NextResponse.json(
          {
            status: "failed",
            predictionId: prediction.id,
            message: "Video generation exceeded the allowable time window.",
          },
          { status: 200 }
        );
      }

      await wait(3500);

      const latestResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (!latestResponse.ok) {
        break;
      }

      prediction = await latestResponse.json();
    }

    if (prediction.status !== "succeeded") {
      return NextResponse.json(
        {
          status: "failed",
          predictionId: prediction.id,
          message:
            prediction.error ??
            "The video model did not finish successfully. Adjust your prompt or try again.",
        },
        { status: 200 }
      );
    }

    const output = prediction.output;
    const videoUrl = Array.isArray(output)
      ? output.find((item: unknown) => typeof item === "string")
      : typeof output === "string"
        ? output
        : null;

    if (!videoUrl) {
      return NextResponse.json(
        {
          status: "failed",
          predictionId: prediction.id,
          message: "The diffusion model returned an unexpected output payload.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      status: "succeeded",
      predictionId: prediction.id,
      videoUrl,
      message: "Success! Video diffusion output is ready for review.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        status: "failed",
        message: error instanceof Error ? error.message : "Unexpected error occurred.",
      },
      { status: 200 }
    );
  }
}
