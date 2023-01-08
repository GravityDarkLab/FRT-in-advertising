#!/usr/bin/env python3
import sys
sys.path.append("/usr/lib/python3.9")
import random

VERSION = 1

from flask import Flask,jsonify,redirect,render_template,request,session
import base64,copy,json,logging,os,re,sys,time
from functools import wraps

import cv2

from deepface import DeepFace
from deepface.detectors import FaceDetector

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
application = app
app.secret_key = b"flag{hello world}" # TODO

PATH_STORAGE = "/frt/storage"
MODELS = ["VGG-Face","Facenet","Facenet512","OpenFace","DeepFace","DeepID","ArcFace","Dlib","SFace"]
BACKENDS = ["opencv","ssd","dlib","mtcnn","retinaface","mediapipe"]
DETECTORS = {}

VALUES1 = ["not at all","I know a little bit","in the middle","I'm rather familiar aith it","I'm an expert"]
VALUES2 = ["positive","rather positive","neutral","rather negative","negative"]
VALUES3 = ["not at all","in exceptional cases","50/50","in many cases","everywhere"]
VALUES4 = ["none","a little","50/50","quite some","massive"]
VALUES5 = ["not at all","a few parts","half of it","quite some","massively"]
VALUES6 = ["never","sometimes","in half of the cases","usually","never"]
QUESTIONS = [
    {"key":"q1","occurence":[1],"question":"How experienced are you in IT?","type":"1-5","values":VALUES1},
    {"key":"q2","occurence":[1],"question":"How familiar are you with facial categorization technologies?","type":"1-5","values":VALUES1},
    {"key":"q3","occurence":[1,2,3],"question":"How do you perceive facial categorization technologies in general?","type":"1-5","values":VALUES2},
    {"key":"q4","occurence":[1,2,3],"question":"Do you think facial categorization technologies should be used in public surveillance","type":"1-5","values":VALUES3},
    {"key":"q5","occurence":[1,2,3],"question":"Do you think facial categorization technologies should be used in advertisement","type":"1-5","values":VALUES3},
    {"key":"q6","occurence":[1,2,3],"question":"Do you think facial categorization technologies should be used in hiring process","type":"1-5","values":VALUES3},
    {"key":"q8","occurence":[2,3],"question":"How much influence do you think advertisements have in general?","type":"1-5","values":VALUES4},
    {"key":"q9","occurence":[2,3],"question":"How much do you think advertisements influence you?","type":"1-5","values":VALUES5},
    {"key":"q10","occurence":[3],"question":"Shall facial categorization technologies be used to suggest personalized ads based on your age?","type":"1-5","values":VALUES6},
    {"key":"q11","occurence":[3],"question":"Shall facial categorization technologies be used to suggest personalized ads based on your demographics?","type":"1-5","values":VALUES6},
    {"key":"q12","occurence":[3],"question":"Shall facial categorization technologies be used to suggest personalized ads based on your emotion?","type":"1-5","values":VALUES6},
    {"key":"q13","occurence":[3],"question":"Shall facial categorization technologies be used to suggest personalized ads based on your gender?","type":"1-5","values":VALUES6},
    {"key":"q14","occurence":[3],"question":"Do you understand facial categorization technologies now?","type":"1-5","values":VALUES5},
    {"key":"q15","occurence":[3],"question":"What do you think about facial categorization technologies?","type":"free","placeholder":""},
]

##TODO:for different emotions use the same files but with different labels maybe?

## Set one: for 0-10 ::: fastfood; sweets; toys; mobile game 
FILES_SET_1 = [{"file":"/static/img/fastfood.png","label":"Too delicious to be true!"},
{"file":"/static/img/sweets.png","label":"Sweeter than fruits!"},
{"file":"/static/img/toys.png","label":"Never get bored again"},
{"file":"/static/img/mobilegame.png","label":"Start now and get 100 coins for free!"}]
## Set Two: for 11-15 ::: smartphones; tech; clothes --> 
FILES_SET_2 = [{"file":"/static/img/fastfood.png","label":"Too delicious to be true!"},
{"file":"/static/img/sweets.png","label":"Lift your spirits!"},
{"file":"/static/img/mobilegame.png","label":"Start now and get 100 coins free!"},
{"file":"/static/img/tech.png","label":"No one can beat your new Smartphone!"},
{"file":"/static/img/sweater.png","label":"Catch everyone's attention!"}]
## Set Three: for 16-17 ::: beer; soft alcohool; wine
FILES_SET_3 = [{"file":"/static/img/mobilegame.png","label":"Start now and get 100 coins free!"},
{"file":"/static/img/tech.png","label":"No one can beat your new Smartphone!"},
{"file":"/static/img/sweater.png","label":"Catch everyone's attention!"},
{"file":"/static/img/beer.png","label":"Wanna be cool?"},
{"file":"/static/img/alcopop.png","label":"Lots of fun: Just like you."},
{"file":"/static/img/fastfood.png","label":"Too delicious to be true!"},
{"file":"/static/img/sweets.png","label":"Lift your spirits!"},
{"file":"/static/img/wine.png","label":"Special moments call for special drinks:"}]
## Set Four: for 18-25 ::: tabak; vaping; hard alcohol; gambling;CBD;
FILES_SET_4 = [{"file":"/static/img/tech.png","label":"No one can beat your new Smartphone!"},
{"file":"/static/img/sweater.png","label":"Catch everyone's attention!"},
{"file":"/static/img/beer.png","label":"Share a cold one!"},
{"file":"/static/img/alcopop.png","label":"Lots of fun: Just like you."},
{"file":"/static/img/wine.png","label":"Special moments call for special drinks:"},
{"file":"/static/img/cigarettes.png","label":"Best friendships start with this:"},
{"file":"/static/img/vape.png","label":"Join the trend with style"},
{"file":"/static/img/hardliqueur.png","label":"Get the party to the next level!"},
{"file":"/static/img/gambling.png","label":"Start now and double your money in a week!"},
{"file":"/static/img/fastfood.png","label":"Best. Taste. Ever."},
{"file":"/static/img/sweets.png","label":"Lift your spirits!"},
{"file":"/static/img/mobilegame.png","label":"Start now and get 100 coins free!"},
{"file":"/static/img/cbd.png","label":"Open your mind with us:"}]
##Set Five: for 26-40 ::: cars, workout
FILES_SET_5 = [{"file":"/static/img/beer.png","label":"Cold one after work?"},
{"file":"/static/img/wine.png","label":"Enter the weekend with style"},
{"file":"/static/img/mobilegame.png","label":"Start now and get 100 coins free!"},
{"file":"/static/img/vape.png","label":"Time to give up cigarettes?"},
{"file":"/static/img/sweets.png","label":"Your friend's kid would love it..."},
{"file":"/static/img/fastfood.png","label":"You don't have to cook, save your precious time:"},
{"file":"/static/img/tech.png","label":"Chips that actually improve your life."},
{"file":"/static/img/hardliqueur.png","label":"On the rocks?"},
{"file":"/static/img/sweater.png","label":"Your new charming and cozy knitted favorite:"},
{"file":"/static/img/gambling.png","label":"Start now and double your money in a week!"},
{"file":"/static/img/cbd.png","label":"Soothe your mind and be happier!"},
{"file":"/static/img/cigarettes.png","label":"Faithful companion:"},
{"file":"/static/img/car.png","label":"Freedom to go wherever you please, whenever:"},
{"file":"/static/img/workout.png","label":"Get in the best shape of your life"}]
##Set Six: for +41 ::: medicine
FILES_SET_6 = [{"file":"/static/img/beer.png","label":"Cold one after work?"},
{"file":"/static/img/wine.png","label":"Enter the weekend with style"},
{"file":"/static/img/mobilegame.png","label":"Start now and get 100 coins free!"},
{"file":"/static/img/vape.png","label":"Time to give up cigarettes?"},
{"file":"/static/img/sweets.png","label":"Your friend's kid would love it..."},
{"file":"/static/img/fastfood.png","label":"You don't have to cook, save your precious time:"},
{"file":"/static/img/tech.png","label":"Chips that actually improve your life."},
{"file":"/static/img/hardliqueur.png","label":"On the rocks?"},
{"file":"/static/img/sweater.png","label":"Your new charming and cozy knitted favorite:"},
{"file":"/static/img/gambling.png","label":"Invest your money now, never too late"},
{"file":"/static/img/cbd.png","label":"Soothe your mind and be happier!"},
{"file":"/static/img/cigarettes.png","label":"Faithful companion:"},
{"file":"/static/img/car.png","label":"Freedom to go wherever you please, whenever:"},
{"file":"/static/img/medicine.png","label":"A magical cure!"},
{"file":"/static/img/workout.png","label":"Get in the best shape of your life"}]


## TODO: for emotions add other sets of files (FILES_SET_1, FILES_SET_11,FILES_SET_12 ...)and add a fiels correspanding to each emotion in the table
ADS = [
        {"age":range(0,11,1),"files": FILES_SET_1},
        {"age":range(11,16,1),"files":FILES_SET_2},
        {"age":range(16,18,1),"files":FILES_SET_3},
        {"age":range(18,26,1),"files":FILES_SET_4},
        {"age":range(26,41,1),"files":FILES_SET_5},
        {"age":range(41,100,1),"files":FILES_SET_6},
    ]



def store_file(content,name=None,question=False):
    if name is None:
        name = "question" if question else "file"
        name += "-{}.ransom".format(round(time.time(),3))
        name = os.path.join(PATH_STORAGE,name)
    with open(name,"wb") as f:
        f.write(content)
    return name


def consent_required(f):
    @wraps(f)
    def wrap(*args):
        if not session.get("agree",False) or session.get("version",0) != VERSION:
            return render_template("consent.html",nosurvey=False,page="consent")
        return f(*args)
    return wrap


@app.route("/consent",methods=["POST"])
def consent():
    session.permanent = True
    session["version"] = VERSION
    session["agree"] = True
    session["user_id"] = os.urandom(16)
    session["question"] = 0
    return redirect("/")


@app.route("/")
@consent_required
def index():
    return redirect("/intro")
    #return render_template("index.html",nosurvey=session["question"]==3,page="")


@app.route("/about")
@consent_required
def about():
    return render_template("about.html",nosurvey=session["question"]==3,page="about")


@app.route("/demo")
@consent_required
def demo():
    return render_template("demo.html",nosurvey=session["question"]==3,page="demo")


@app.route("/intro")
@consent_required
def intro():
    return render_template("motivation.html",nosurvey=session["question"]==3,page="intro")


@app.route("/theory")
@consent_required
def theory():
    return render_template("theory.html",nosurvey=session["question"]==3,page="theory")


@app.route("/question",methods=["GET","POST"])
@consent_required
def question():
    # could use flask forms here or we deal with it in javascript
    question_set = session["question"] + 1
    if question_set < 1 or question_set > 3:
        return redirect("/")

    if request.method == "POST":
        answers = {"user_id":base64.b64encode(session["user_id"]).decode()}
        for k in request.form.keys():
            if re.fullmatch("q\\d+-\\d",k) is None:
                print("unknown key",k,flush=True)
                continue
            answers[k] = request.form[k] # TODO input validation

        store_file(json.dumps(answers).encode(),question=True)
        session["question"] += 1
        return redirect(["/demo","/theory","/about"][question_set-1])
    return render_template("question.html",questions=QUESTIONS,question_set=question_set,nosurvey=False,page="question")


def analyze(imgPath):
    try:
        return DeepFace.analyze(img_path=imgPath,enforce_detection=False,detector_backend=BACKENDS[0])
    except Exception as e:
        logging.exception(e)
        return None


def detect(imgPath):
    try:
        return DeepFace.detectFace(img_path=imgPath,detector_backend=BACKENDS[0])
    except Exception as e:
        logging.exception(e)
        return None

def process_face(fimg,fpos,frame):
    if fimg is None:
        return None,frame
    _,cimg = cv2.imencode(".PNG",fimg[:,:])
    res = analyze(fimg)

    x,y,w,h = fpos
    frame = cv2.rectangle(frame,(x,y),(x+w,y+h),(255,0,0),2)
    if res is not None:
        keys = ["angry","happy","sad","surprise","neutral"]
        offset = 0
        for k in keys:
            offset += 25
            frame = cv2.putText(frame,"{}: {:.2f}".format(k,res["emotion"][k]),(x+w+10,y+offset),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,0,0),2)
    cv2.putText(frame, str(res["age"]),(x+10,y-10),cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,255,255),2)
    cv2.putText(frame, str(res["gender"]),(x+w-50,y-10),cv2.FONT_HERSHEY_SIMPLEX,0.7,(255,255,255),2)
    return res,frame


# returns an array of ads based on analysis
def get_ads(anaylsis):
    #return ads based on age
    ads = []
    if anaylsis is not None:
        age = anaylsis["age"]
        for value in ADS:
            if age in value["age"]:
                ads.extend(random.sample(value["files"],2))
                break
    #TODO: based on emotions
        return ads
    else:
        return None


@app.post("/file")
@consent_required
def file():
    req = json.loads(request.data)
    model = req["model"]
    backend = req["backend"]
    if DETECTORS.get(backend) is None:
        x = time.time()
        DETECTORS[backend] = FaceDetector.build_model(backend)
        diff = time.time() - x
        print("build model",backend,diff,flush=True)
    content = base64.b64decode(req["content"])
    if model not in MODELS or backend not in BACKENDS or len(content) != req["size"]:
        return jsonify({}),403
    req2 = copy.deepcopy(req)
    req2["user_id"] = base64.b64encode(session["user_id"]).decode()
    req2.pop("content")
    tmp = store_file(content)
    try:
        img_tmp = cv2.imread(tmp)
    finally:
        os.unlink(tmp)

    result = {}
    result["model"] = model
    result["backend"] = backend
    ##Detect the Faces
    faces = FaceDetector.detect_faces(DETECTORS[backend],detector_backend=backend,img=img_tmp)
    rfaces = []
    frame = img_tmp
    maxv = 0
    maximg = None
    maxpos = None
    for fimg,fpos in faces:
        x = fpos[2] * fpos[3]
        if x > maxv:
            maximg = fimg
            maxpos = fpos
            maxv = x
    for fimg,fpos in faces:
        if fpos != maxpos:
            x,y,w,h = fpos
            frame = cv2.rectangle(frame,(x,y),(x+w,y+h),(0,0,255),2)

    ## Get all the Data
    result["analysis"],frame = process_face(maximg,maxpos,frame)

    _,cimg = cv2.imencode(".PNG",frame[:,:])
    result["annotated"] = "data:image/png;base64,{}".format(str(base64.b64encode(cimg))[2:-1])
    ## Get the faces
    result["faces"] = rfaces
    ## Get The Adds based on age and emotion
    result["ads"] = get_ads(result["analysis"])
    
    if result["analysis"] is not None:
        ## Rmoved region, emotions and race (dominant_race and dominant_emotion are enough)
        result["analysis"].pop('region',None)
        result["analysis"].pop('race',None)
        result["analysis"].pop('emotion',None)
        ## Renamed the keys
        result["analysis"]['Dominant Emotion: '] = result["analysis"].pop('dominant_emotion',None)
        result["analysis"]['Dominant Race: '] = result["analysis"].pop('dominant_race',None)
        result["analysis"]['Age:'] = result["analysis"].pop('age',None)
        result["analysis"]['Gender:'] = result["analysis"].pop('gender',None)
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0")
