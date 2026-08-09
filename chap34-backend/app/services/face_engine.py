"""
Shared InsightFace FaceAnalysis singleton (buffalo_l model pack).

Both gender detection and the photo-generation pipeline (alignment +
cropping, via face.kps) need only the detector's own 5-point keypoints
plus genderage — neither uses face recognition or the dense landmark
models. buffalo_l bundles 5 ONNX models totaling ~340MB on disk
(recognition alone is ~175MB, the 3D landmark model ~145MB), so loading
the full pack was the main reason the process OOM-crashed on memory-
constrained hosts (e.g. free-tier Render's 512MB). `allowed_modules`
restricts loading to the ~18MB detection+genderage actually used.

Runs on CPU by default (CPUExecutionProvider) so it works without a GPU.
"""
import threading

_app = None
_app_lock = threading.Lock()


def get_face_app():
    """Load the FaceAnalysis app once and reuse it across requests."""
    global _app
    if _app is not None:
        return _app

    with _app_lock:
        if _app is None:
            from insightface.app import FaceAnalysis

            app = FaceAnalysis(
                name="buffalo_l",
                providers=["CPUExecutionProvider"],
                allowed_modules=["detection", "genderage"],
            )
            # ctx_id=-1 forces CPU. det_size is the detector input size.
            app.prepare(ctx_id=-1, det_size=(640, 640))
            _app = app
    return _app
