# Facial Classification Technologies in Advertising: the 2026 update

Achraf Labidi, November 2026

This is a companion to the 2022 seminar paper [*Facial Classification Technologies in Advertising*](../../frontend/public/paper/facial-classification-technologies-in-advertising-2022.pdf) by Adrian Pesch, Po Chieh Lin, Ege Kurt, Nicole Kubitza, Caner Karaoglu, Achraf Labidi and Markus Vrancea (Technical University of Munich). That paper is unchanged. This document records what the 2026 rebuild of its web application changed, what was measured along the way, and which of the paper's statements still hold.

## Summary

The 2022 application let a visitor's webcam feed a face classifier and showed the ads an advertiser would target at the result. It was also a study: 51 participants answered the same questions three times as they moved through the site.

The 2026 rebuild keeps the demonstration and the explanation and replaces everything underneath:

- The classifier (DeepFace) is replaced by three smaller models chosen by measured accuracy. They are more accurate on every attribute tested and need a thirteenth of the disk space.
- The emotion reading, the weakest part, is reported as one of four moods with a confidence that matches how often the reading is right.
- Ads are targeted by mood as well as age, which the 2022 version had left as an open task.
- Nothing is stored. The rebuild runs no questionnaire, so **there is no new user study**: every finding about participants' attitudes is from 2022 and was made with the original models.

All accuracy figures below come from a few hundred labelled photos per test. They are good enough to choose between models; they are not benchmark results.

## 1. The 2022 study in brief

Participants walked through an introduction, a live demo and a theory page, answering a questionnaire after each. The paper reports:

- 51 participants, mostly computer science students at TUM, familiar with IT but not with facial classification.
- A majority rejected facial classification for personalised advertising and for hiring. More than 66 % disagreed with its widespread use in public surveillance.
- Personalising ads by emotion was rejected most strongly.
- No significant change in attitude between the three rounds of questions.
- More than 10 % did not use their camera, and so never saw the demo applied to themselves.
- Participants criticised the demo for classifying them wrongly.

The paper lists three directions for future work: letting people upload a photo instead of using a camera, testing on more devices including phones, and stronger privacy with clear information about stored data. Section 6 returns to each.

## 2. What was rebuilt

| | 2022 | 2026 |
|---|---|---|
| Frontend | Server-rendered pages (Flask, Jinja), Vue for the demo | Static single-page site (TypeScript, React, Mantine), deployable to object storage and a CDN |
| Backend | Flask, DeepFace on TensorFlow | Stateless FastAPI service, ONNX Runtime |
| Per frame | About 450 ms (measured on current DeepFace) | About 50 ms |
| Model weights | 1.5 GB | 116 MB |
| Memory | 3.8 GB peak | About 300 MB idle |
| Storage | Survey answers on disk, session cookie | None |
| Tests | None | 123 backend, 114 frontend, run on every pull request |

The demo also changed in how it behaves. It does nothing until the visitor starts the camera. The server no longer draws on the image; it returns coordinates and the browser draws the box. The box follows the face: a detector-only request, about 2 ms on the server, runs some eight times a second between the full analyses, which stay at one a second. Ads no longer reshuffle on every frame.

## 3. Choosing the models

Candidates were scored on the same labelled photos: 600 from the FairFace validation set (balanced across seven race groups), 600 from UTKFace (exact ages from 1 to 100) and 700 from the FER2013 test set. Each model was given the face crop that suited it best. With 600 photos, a difference under about four points is noise.

| Model | Weights | Gender (FairFace / UTKFace) | Age bracket, exact / within one | Race, 6 groups |
|---|---|---|---|---|
| **FairFace ResNet-34** (used) | 85 MB | **92.7 % / 93.7 %** | **57.5 % / 96.5 %** | **77.0 %** |
| FastFace teacher | 83 MB | 91.5 % / 98.5 %* | 53.5 % / 94.8 % | none |
| DeepFace (the 2022 choice) | 1.5 GB | 75.7 % / 79.5 % | 35.0 % / 71.8 % | 61.2 % |
| InsightFace genderage | 1 MB | 80.5 % / 85.0 % | 29.2 % / 70.7 % | none |
| GoogLeNet age and gender (2015) | 48 MB | 78.0 % / 76.5 % | 31.5 % / 70.8 % | none |

\* FastFace was trained on UTKFace, so that figure is inflated.

Scored on its native seven race groups, FairFace is right for 70.2 % of faces. The table merges East and Southeast Asian so that it can be compared with DeepFace, which has six.

Two things stand out.

**The 2022 participants were right to complain.** The classifier they saw got gender wrong for about one face in four and placed about a third of faces in the right ten-year age range.

**How the face is cropped matters as much as the model.** FairFace given the detector's box with no padding scored 70.2 % on race; with 25 % padding, 63.2 %; given the whole image, 31.3 %. The service therefore crops tightly, and the choice is recorded in the code.

Detection uses YuNet, which found a face in 1,199 of 1,200 test photos.

### Age

FairFace predicts nine age ranges (0–2, 3–9, 10–19, and so on up to 70+), not a number. The single figure shown is the probability-weighted midpoint of the ranges, rounded down. On UTKFace it is off by 5.8 years on average and puts a face on the right side of eighteen 97.5 % of the time. That last figure is the one that matters here, because the ad sets change at eighteen: about one face in forty lands on the wrong side.

## 4. Emotion

Emotion is the least reliable attribute, in 2022 and now. On AffectNet, the standard benchmark, two human annotators agree on the label for roughly 60–65 % of faces, and the best openly available models score in the same range. No candidate was meaningfully better than the one chosen (HSEmotion, an EfficientNet-B2; 63 % on eight classes as published), and training a new model without access to the restricted datasets would not have helped.

Three changes were made instead, each measured on the 700 FER2013 faces. FER2013 is a weak stand-in for a webcam: its faces are 48-pixel greyscale crops.

**Contempt is no longer reported.** The model answered "contempt" for 5.1 % of the faces. None of them carries that label. Removing the class raised accuracy from 53.0 % to 55.6 %.

**Emotions are pooled into four moods.** The model confuses neighbours (sad with afraid, angry with disgusted) far more than groups. Pooled into *up* (happiness, surprise), *low* (sadness, fear), *tense* (anger, disgust) and *neutral*, it is right for 65.6 % of faces.

**The confidence is calibrated.** In use, a clear laugh showed "30 % happy". The label was right; the number was not. The model's score turned out to be a poor guide to whether it is right, and in opposite directions for different moods:

| When the model says | It is right | Its average score |
|---|---|---|
| up | 82 % | 0.53 |
| low | 67 % | 0.62 |
| tense | 53 % | 0.67 |
| neutral | 62 % | 0.41 |

A single temperature cannot fix this, since one mood is under-confident and another over-confident. A logistic fit per mood, mapping the score to the probability that the reading is right, cut the expected calibration error on held-out faces from 0.109 to 0.037 (two-fold). The same smiling test portrait that read "happiness 37 %" now reads "happy 83 %". An angry reading now shows a low confidence, which is accurate: it is right about half the time.

On the site, the mood shown is the most common one over the last three frames.

## 5. Ad targeting

The six age sets and their slogans are those of the 2022 application. The estimated age, rounded down, selects the set, so a face judged 17.5 is treated as a minor.

Mood targeting is new. The 2022 code carried a note to use "the same files but with different labels" for different emotions, and the paper warned that ads shown to a sad person "may exacerbate that emotion". The rebuild makes that concrete. Within the age set, ads that have a slogan written for the visitor's mood are preferred and shown with it: comfort for a low mood, release for a tense one, impulse for a good one. The page states who the ads were chosen for.

Three limits are built in. A mood is targeted only when its calibrated confidence is at least 50 %. Mood never widens the choice beyond the age set, so it cannot bring a minor tobacco, gambling or spirits. And the ads on screen change only when a new age set or mood is read on two frames in a row.

The mood slogans were written for the rebuild and are deliberately manipulative. They illustrate the paper's section on neuromarketing; they are not a recommendation.

## 6. The 2022 future work, revisited

**Uploading a photo.** Not done. The demo still needs a camera, so the tenth of participants who would not use one are still excluded. This remains the most useful missing feature.

**More devices, and phones.** Partly done. The layout is responsive and was checked at phone widths, in light and dark, in a desktop browser's emulation. It has not been tested on physical phones.

**Privacy.** Done by removal. The 2022 paper asked for clear information about what is stored, for how long, and how to have it deleted. The rebuild stores nothing: a frame is held in memory for one request and discarded, and there are no accounts, cookies or analytics. The page says so beside the button that starts the camera.

The paper also notes a mistake in one answer scale, which listed "never" at both ends. The questionnaire is not part of the rebuild.

## 7. What this update does not show

- **Attitudes.** No participants were recruited. Whether a more accurate, more candid demo changes anyone's view is untested. The 2022 result of no significant change stands as the only evidence.
- **Accuracy in real use.** The test sets are public photo collections, not webcam frames in a room. The emotion calibration in particular rests on greyscale thumbnails.
- **Fairness across groups.** FairFace was chosen partly because it was trained on balanced data, but this update did not break accuracy down by race, gender or age group. The paper's section on data bias applies in full.
- **The ethics of showing race.** The demo displays a race label because the 2022 application did and because the point is to show what such systems claim. It is right for about seven faces in ten and should be read with that in mind.
- **Licences for commercial use.** The FairFace authors publish no licence file for their weights, and the emotion model was trained on a research-only dataset. The project is a non-commercial showcase.

## Sources

The 2022 paper's reference list is unchanged and is reproduced on the site's About page. The rebuild adds:

- Kimmo Kärkkäinen and Jungseock Joo. *FairFace: Face Attribute Dataset for Balanced Race, Gender, and Age.* WACV 2021. <https://arxiv.org/abs/1908.04913>
- Yakhyokhuja Valikhujaev. *fairface-onnx* (the ONNX export used). <https://github.com/yakhyo/fairface-onnx>
- Wei Wu, Hanyang Peng and Shiqi Yu. *YuNet: A Tiny Millisecond-level Face Detector.* Machine Intelligence Research 20, 2023. Model: <https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet>
- Andrey V. Savchenko. *Facial expression and attributes recognition based on multi-task learning of lightweight neural networks.* 2021. <https://arxiv.org/abs/2103.17107>. Model: <https://github.com/av-savchenko/face-emotion-recognition>
- Ali Mollahosseini, Behzad Hasani and Mohammad H. Mahoor. *AffectNet: A Database for Facial Expression, Valence, and Arousal Computing in the Wild.* 2017. <https://arxiv.org/abs/1708.03985>
- *Label quality in AffectNet: results of crowd-based re-annotation.* 2021. <https://arxiv.org/abs/2110.04476>
- Ian J. Goodfellow et al. *Challenges in Representation Learning: A report on three machine learning contests* (FER2013). 2013. <https://arxiv.org/abs/1307.0414>
- Zhifei Zhang, Yang Song and Hairong Qi. *Age Progression/Regression by Conditional Adversarial Autoencoder* (UTKFace). CVPR 2017. <https://susanqq.github.io/UTKFace/>
- Chuan Guo, Geoff Pleiss, Yu Sun and Kilian Q. Weinberger. *On Calibration of Modern Neural Networks.* ICML 2017. <https://arxiv.org/abs/1706.04599>
- Sefik Ilkin Serengil and Alper Ozpinar. *HyperExtended LightFace: A Facial Attribute Analysis Framework* (DeepFace, the 2022 classifier). ICEET 2021. <https://doi.org/10.1109/ICEET53442.2021.9659697>
- *FastFace* model card (a candidate that was not chosen). <https://huggingface.co/iFurySt/fastface>
