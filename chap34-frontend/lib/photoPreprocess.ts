/**
 * Client-side photo prep: runs entirely in the browser (face-api.js, a
 * TF.js-based library) before a photo is ever uploaded. Detects the face,
 * reads gender off it, crops to a generous head-and-shoulders box, and
 * downscales - all for free on Netlify's static hosting, with no backend
 * involved. This is what shrinks big phone-camera photos before upload and
 * keeps the later paid OpenAI background-removal call cheap.
 */
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";
const MAX_LONG_EDGE = 1280;
const CROP_MARGIN_X = 0.6; // extra room each side of the detected face box
const CROP_MARGIN_TOP = 0.6;
const CROP_MARGIN_BOTTOM = 1.8; // extra room below for shoulders

export class NoFaceDetectedError extends Error {
  constructor() {
    super("در عکس چهره‌ای پیدا نشد. لطفاً عکس واضح‌تری با چهره‌ی مشخص انتخاب کنید.");
    this.name = "NoFaceDetectedError";
  }
}

export interface PreprocessResult {
  blob: Blob;
  gender: "male" | "female";
  genderConfidence: number;
}

let modelsLoaded: Promise<void> | null = null;

/**
 * Loads the face-api.js models exactly once and caches the in-flight/
 * resolved promise, so both the live camera preview (CameraCapture) and
 * this module's own preprocessPhoto() can call it freely without paying
 * for a second download.
 */
export function loadModels(): Promise<void> {
  if (!modelsLoaded) {
    modelsLoaded = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsLoaded;
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Decode already happened by the time onload fires, so the object
      // URL isn't needed past this point.
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تصویر قابل خواندن نیست"));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("خروجی عکس ساخته نشد"))),
      "image/jpeg",
      quality
    );
  });
}

/**
 * Detects the face in `file`, reads gender off it, crops to a generous
 * head-and-shoulders box, and downscales. Throws NoFaceDetectedError if no
 * face is found. Accepts a Blob too (e.g. a frame captured from the live
 * camera preview via canvas.toBlob), not just a File from an <input>.
 */
export async function preprocessPhoto(file: File | Blob): Promise<PreprocessResult> {
  await loadModels();

  const img = await loadImage(file);

  // Browsers auto-apply EXIF orientation when decoding <img>, so drawing
  // it to a canvas here already captures correctly-rotated pixels - no
  // separate EXIF-parsing step needed.
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const fullCanvas = document.createElement("canvas");
  fullCanvas.width = Math.round(img.naturalWidth * scale);
  fullCanvas.height = Math.round(img.naturalHeight * scale);
  const fullCtx = fullCanvas.getContext("2d");
  if (!fullCtx) throw new Error("پردازش تصویر پشتیبانی نمی‌شود");
  fullCtx.drawImage(img, 0, 0, fullCanvas.width, fullCanvas.height);

  const detection = await faceapi
    .detectSingleFace(fullCanvas, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks(true)
    .withAgeAndGender();

  if (!detection) {
    throw new NoFaceDetectedError();
  }

  const { box } = detection.detection;
  const marginX = box.width * CROP_MARGIN_X;
  const cropX = Math.max(0, box.x - marginX);
  const cropY = Math.max(0, box.y - box.height * CROP_MARGIN_TOP);
  const cropRight = Math.min(fullCanvas.width, box.x + box.width + marginX);
  const cropBottom = Math.min(fullCanvas.height, box.y + box.height * (1 + CROP_MARGIN_BOTTOM));
  const cropWidth = cropRight - cropX;
  const cropHeight = cropBottom - cropY;

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.round(cropWidth);
  cropCanvas.height = Math.round(cropHeight);
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) throw new Error("پردازش تصویر پشتیبانی نمی‌شود");
  cropCtx.drawImage(
    fullCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height
  );

  const blob = await canvasToJpegBlob(cropCanvas, 0.85);

  return {
    blob,
    gender: detection.gender === "male" ? "male" : "female",
    genderConfidence: Math.round(detection.genderProbability * 100) / 100,
  };
}
