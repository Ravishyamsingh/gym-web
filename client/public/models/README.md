The face-api.js neural network model weights go in this directory.

Download the required models from:
https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Required model directories (copy the full folders here):
  - ssd_mobilenetv1_model-weights_manifest.json + shard files
  - face_landmark_68_model-weights_manifest.json + shard files
  - face_recognition_model-weights_manifest.json + shard files

Or download them programmatically:
  curl -L https://github.com/nicolo-ribaudo/face-api.js/raw/master/weights/ssd_mobilenetv1_model-weights_manifest.json -o ssd_mobilenetv1_model-weights_manifest.json
  (repeat for all required manifest + shard files)
