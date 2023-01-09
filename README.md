<h1 align="center">FRT in Advertising</h1>

This project was a collaborative effort completed for a university course titled, "Making People Understand Facial Recognition Technologies: Building an AI Application as Didactic Tool".

<div align="center">
<img src="https://github.com/GravityDarkLab/FRT-in-advertising/blob/main/capture/capture.png" width="700" height="500"/>
</div>

## Description:

As part of this study, participants will be asked to browse through four pages on our website: introduction, demonstration, theory, and about us. Between each pair of pages, they will be required to complete a survey to assess any changes or evolution in their attitude towards the topic. There are three  surveys in total. This will allow us to track the impact of the information presented on their perspective.

- Introduction page: This page provides a  brief introduction, our motivation for creating
this resource, a short explanation of our demonstration, and a list of
the tools we used.

- Demo page: The demonstration page of our website allows users to access their webcam and capture a images of their faces.
This images is then used by [deepface](https://github.com/serengil/deepface) in the backend to generate classified information, including age, gender, race, and emotion. These results are displayed to provide users with an understanding of the capabilities of FCT . Additionally, simulated advertisements
are generated based on their age.
The shown advertisement pictures were created specifically for this application, so they would not refer to specific brands and could be viewed as dummy ads.
- Theory page: This section delves deeper into the inner workings of the technology, allowing users to gain a greater understanding of how it functions
and operates.
- About us. On this page, the focus is on introducing the circumstances of the project and the different participants.
From this page onward, the user will be able to freely browse the website without the need to complete any further surveys.

## Getting started:
1. Install [Docker](https://www.docker.com/) in your Laptop.
2. From the terminal, run the following command.
```
$ docker-compose up
```

## Notes:
- This installation process may take up to 15 minutes, depending on your network connection. All necessary dependencies will be installed during this time.
- Please note that the first execution may take up to 15 minutes as the necessary weights for facial recognition will be downloaded at this time.
- Please ensure that you have at least 2GB of free storage available.

## Contact
Achraf Labidi - [LinkedIn](https://www.linkedin.com/in/ashraf-labidi-0xff3e/)

Other Projects - [GravityDarkLab](https://github.com/GravityDarkLab)


