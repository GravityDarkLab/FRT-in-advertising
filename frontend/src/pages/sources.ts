/** A work the project draws on. `url` only where one is printed in the paper or verified. */
export type Source = { cite: string; title: string; url?: string }

/** The reference list of the 2022 paper (its two entries for the TechRepublic article merged). */
export const sources2022: Source[] = [
  {
    cite: 'Aimal Khan.',
    title: 'What are the ethical issues of using facial recognition technology?',
    url: 'https://www.engineeringpassion.com/ethical-issues-of-using-facial-recognition-technology/',
  },
  {
    cite: 'John Davis Akkara, Anju Kuriakose, et al. Kerala Journal of Ophthalmology 31(3), 2019.',
    title: 'Smartphone apps for visually impaired persons',
  },
  {
    cite: 'Joy Buolamwini and Timnit Gebru. Conference on Fairness, Accountability and Transparency, 2018.',
    title: 'Gender Shades: Intersectional accuracy disparities in commercial gender classification',
    url: 'https://proceedings.mlr.press/v81/buolamwini18a.html',
  },
  {
    cite: 'CyberLink.',
    title: 'FaceMe: facial recognition software for businesses and developers',
    url: 'https://www.cyberlink.com/faceme',
  },
  {
    cite: 'Arne De Keyser, Yakov Bart, Xian Gu, Stephanie Q. Liu, Stacey G. Robinson and P. K. Kannan. Journal of Business Research 136, 2021.',
    title:
      'Opportunities and challenges of using biometrics for business: Developing a research agenda',
    url: 'https://doi.org/10.1016/j.jbusres.2021.07.028',
  },
  {
    cite: 'Patrick Gray. TechRepublic.',
    title: 'Ethical issues of facial recognition technology',
    url: 'https://www.techrepublic.com/article/ethical-issues-facial-recognition/',
  },
  {
    cite: 'Sander Greenland, Mohammad Ali Mansournia and Douglas G. Altman. BMJ 352, 2016.',
    title: 'Sparse data bias: a problem hiding in plain sight',
  },
  {
    cite: 'Katam Raju Gangarapu. G2.',
    title: 'Ethics of Facial Recognition: Key Issues and Solutions',
    url: 'https://learn.g2.com/ethics-of-facial-recognition',
  },
  {
    cite: 'Lisa Hallam. Owlcation.',
    title: 'The Effects of Advertising on the Human Brain',
    url: 'https://owlcation.com/social-sciences/The-Effects-of-Advertising-on-the-Human-Brain',
  },
  {
    cite: 'Sefik Ilkin Serengil and Alper Ozpinar. ASYU 2020.',
    title: 'LightFace: A Hybrid Deep Face Recognition Framework',
    url: 'https://doi.org/10.1109/ASYU50717.2020.9259802',
  },
  {
    cite: 'Sefik Ilkin Serengil and Alper Ozpinar. ICEET 2021.',
    title: 'HyperExtended LightFace: A Facial Attribute Analysis Framework',
    url: 'https://doi.org/10.1109/ICEET53442.2021.9659697',
  },
  {
    cite: 'Luke Stark and Jesse Hoey. ACM Conference on Fairness, Accountability, and Transparency, 2021.',
    title: 'The Ethics of Emotion in Artificial Intelligence Systems',
  },
  {
    cite: 'Zhe Li, Tianfan Zhang, Xiao Jing and Youning Wang. Alexandria Engineering Journal 60(1), 2021.',
    title:
      'Facial expression-based analysis on emotion correlations, hotspots, and potential occurrence of urban crimes',
  },
]

/** Models, datasets and methods the 2026 rebuild adds. */
export const sources2026: Source[] = [
  {
    cite: 'Kimmo Kärkkäinen and Jungseock Joo. WACV 2021. The age, gender and race model.',
    title: 'FairFace: Face Attribute Dataset for Balanced Race, Gender, and Age',
    url: 'https://arxiv.org/abs/1908.04913',
  },
  {
    cite: 'Yakhyokhuja Valikhujaev. The ONNX export of the FairFace model used here.',
    title: 'fairface-onnx',
    url: 'https://github.com/yakhyo/fairface-onnx',
  },
  {
    cite: 'Wei Wu, Hanyang Peng and Shiqi Yu. Machine Intelligence Research 20, 2023. The face detector, from the OpenCV model zoo.',
    title: 'YuNet: A Tiny Millisecond-level Face Detector',
    url: 'https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet',
  },
  {
    cite: 'Andrey V. Savchenko. 2021. The emotion model (HSEmotion).',
    title:
      'Facial expression and attributes recognition based on multi-task learning of lightweight neural networks',
    url: 'https://arxiv.org/abs/2103.17107',
  },
  {
    cite: 'Ali Mollahosseini, Behzad Hasani and Mohammad H. Mahoor. 2017. The data the emotion model was trained on.',
    title:
      'AffectNet: A Database for Facial Expression, Valence, and Arousal Computing in the Wild',
    url: 'https://arxiv.org/abs/1708.03985',
  },
  {
    cite: '2021. On how often people agree about the emotion in a face.',
    title: 'Label quality in AffectNet: results of crowd-based re-annotation',
    url: 'https://arxiv.org/abs/2110.04476',
  },
  {
    cite: 'Ian J. Goodfellow et al. 2013. Source of FER2013, used to test and calibrate the emotion model.',
    title: 'Challenges in Representation Learning: A report on three machine learning contests',
    url: 'https://arxiv.org/abs/1307.0414',
  },
  {
    cite: 'Zhifei Zhang, Yang Song and Hairong Qi. CVPR 2017. Source of UTKFace, used to test age and gender.',
    title: 'Age Progression/Regression by Conditional Adversarial Autoencoder',
    url: 'https://susanqq.github.io/UTKFace/',
  },
  {
    cite: 'Chuan Guo, Geoff Pleiss, Yu Sun and Kilian Q. Weinberger. ICML 2017. Why a model’s raw score is not a confidence.',
    title: 'On Calibration of Modern Neural Networks',
    url: 'https://arxiv.org/abs/1706.04599',
  },
]
