const app = Vue.createApp({
	data(){
		return{
			//Force use of DeepFace and opencv
			deepfaceModel:"DeepFace",
			deepfaceBackend:"opencv",
			images:[],
			img:false,
			imgID:0,
			imgProcessed:false,
			processCamInterval:-1,
		};
	},
	mounted(){
		this.openCam()
	},
	methods:{
		processImage(img){
			img.resultState = "loading";
			img.imgID = ++this.imgID;
			fetch("/file",{
				body: JSON.stringify({"model":this.deepfaceModel,"backend":this.deepfaceBackend,...img}),
				method:"POST",
			}).then(res => {
				res.json().then(js=>{
					img.resultState = "loaded";
					img.result = js;
					if(!this.imgProcessed || img.imgID > this.imgProcessed.imgID){
						this.imgProcessed = img;
					}
					this.processCamInterval = setTimeout(()=>{
						this.processCamera();
					},5000);
				}).catch(e=>{
					this.processCamInterval = setTimeout(()=>{
						this.processCamera();
					},5000);
				});
			}).catch(e=>{
				this.processCamInterval = setTimeout(()=>{
					this.processCamera();
				},5000);
				img.resultState = "error";
				img.resultError = "Error: "+e;
				console.error("processing image failed:",e);
			});
		},
		setImage(img){
			this.img = img;
			this.processImage(this.img);
		},
		openCam(){
			navigator.mediaDevices.getUserMedia({
				audio:false,
				video:true,
			}).then(s=>{
				this.$refs.camera.srcObject = s;
				this.$refs.camera.play();
				if(this.processCamInterval < 0){
					this.processCamInterval = setTimeout(()=>{
						this.processCamera();
					},1000);
				}
				s.addEventListener("removetrack",e=>{
					clearTimeout(this.processCamInterval);
					this.processCamInterval = -1;
					this.openCam();
				});
			}).catch(e=>{
				alert("Camera access required for demonstration");
			});
		},
		processCamera(){
			this.$refs.canvas.width = this.$refs.camera.videoWidth;
			this.$refs.canvas.height = this.$refs.camera.videoHeight;
			let ctx = this.$refs.canvas.getContext("2d");
			let time = (new Date()).getTime();
			ctx.drawImage(this.$refs.camera,0,0);
			let url = this.$refs.canvas.toDataURL();
			let content = url.substring(url.indexOf(",")+1);
			let type = url.substring(url.indexOf(":")+1,url.indexOf(";"))
			this.setImage({
				name:'camera-'+time,
				lastModified:time,
				size:atob(content).length,
				type:type,
				content:content,
				camera:true,
			});
		},
	}
});


window.addEventListener("load",e=>{
	app.mount("#app");
});
