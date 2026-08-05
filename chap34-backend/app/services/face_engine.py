"""
Shared InsightFace FaceAnalysis singleton (buffalo_l model pack).

Both gender detection and the photo-generation pipeline (alignment +
cropping) need face detection + landmarks, so they share this one lazily
loaded instance instead of each loading buffalo_l separately (which would
double memory usage and load time).

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
            )
            # ctx_id=-1 forces CPU. det_size is the detector input size.
            app.prepare(ctx_id=-1, det_size=(640, 640))
            _app = app
    return _app
