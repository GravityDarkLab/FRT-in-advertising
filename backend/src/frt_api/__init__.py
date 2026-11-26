"""Stateless face-attribute API behind the FRT in Advertising demo."""

import os
import sys

# OpenCV refuses to decode anything larger than this many pixels (a 4000 x 3000
# photo just fits). Its default is a gigapixel, which lets a 2 MB upload ask for
# gigabytes of memory. OpenCV reads the limit once,
# when it is imported, so a late import of this package must fail loudly
# rather than run unprotected.
if "cv2" in sys.modules:
    raise ImportError("import frt_api before cv2: the decode size limit is set at cv2 import")
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(12_000_000))
# OpenCV 5 warns about its own graph engine every time the detector is built.
os.environ.setdefault("OPENCV_LOG_LEVEL", "ERROR")
