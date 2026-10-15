import type { MuteState } from "./types";

const MUTED_CARD_WIDTH = 640;
const MUTED_CARD_HEIGHT = 480;

export class Compositor {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private buffer: VideoFrame[] = [];
  private bufferSize: number;
  private mutedCardText: string;

  constructor(bufferSize = 4, mutedCardText = "Camera Temporarily Muted") {
    this.canvas = new OffscreenCanvas(MUTED_CARD_WIDTH, MUTED_CARD_HEIGHT);
    this.ctx = this.canvas.getContext("2d")!;
    this.bufferSize = bufferSize;
    this.mutedCardText = mutedCardText;
  }

  pushFrame(frame: VideoFrame): VideoFrame | undefined {
    this.buffer.push(frame);
    if (this.buffer.length > this.bufferSize) {
      return this.buffer.shift();
    }
    return undefined;
  }

  flushAsMuted(): void {
    for (const frame of this.buffer) {
      frame.close();
    }
    this.buffer = [];
  }

  drawMutedCard(): VideoFrame {
    const { ctx, canvas } = this;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e0e0e0";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.mutedCardText, canvas.width / 2, canvas.height / 2);

    const shieldY = canvas.height / 2 - 60;
    ctx.font = "40px system-ui";
    ctx.fillText("🛡️", canvas.width / 2, shieldY);

    return new VideoFrame(canvas, { timestamp: performance.now() * 1000 });
  }

  getOutputFrame(state: MuteState): VideoFrame {
    if (state === "live") {
      const frame = this.buffer.shift();
      if (frame) return frame;
    }

    this.flushAsMuted();
    return this.drawMutedCard();
  }

  setMutedCardText(text: string): void {
    this.mutedCardText = text;
  }

  destroy(): void {
    this.flushAsMuted();
  }
}
