<template>
	<ion-page>
		<ion-header>
			<ion-toolbar>
				<ion-title>Manage signatures</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<ion-header collapse="condense">
				<ion-toolbar>
					<ion-title size="large">Manage signatures</ion-title>
				</ion-toolbar>
			</ion-header>
			<vue-signature-pad id="signature" width="100%" height="500px" ref="signaturePad" />
			<div class="buttons">
				<ion-button color="danger" @click="undo">Undo</ion-button>
				<ion-button color="success" @click="save">Save</ion-button>
			</div>
			<ion-item-divider />
			<ion-list>
				<ion-item v-for="signature in store.signatures" :key="signature.id">
					<ion-thumbnail slot="start">
						<img :src="signature.signature" />
					</ion-thumbnail>
					<ion-label>
						{{ signature.title }}
					</ion-label>
					<ion-button color="danger" @click="store.removeSignature(signature.id)">Remove</ion-button>
				</ion-item>
			</ion-list>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { IonItemDivider, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonThumbnail, modalController } from '@ionic/vue';
import { ref } from "vue";
import { useSignaturesStore } from "@/store/signatures.store";
import SignatureForm from '@/components/singature/signatureForm.vue';
const store = useSignaturesStore();
const signaturePad = ref();

const undo = () => {
	signaturePad.value.undoSignature();
};
const save = async () => {
	const { isEmpty, data } = signaturePad.value.saveSignature();
	if (isEmpty) return;
	displayModal(data);

};

const displayModal = async (image) => {
	const modal = await modalController.create({
		component: SignatureForm,
	});
	modal.present();

	const { data, role } = await modal.onWillDismiss();

	if (role === 'confirm') {
		// remove image type from image base64 string
		image = image.replace(/^data:image\/[a-z]+;base64,/, "");
		cropBase64Image(image).then((croppedImage) => {
			console.log();
			store.addSignature("data:image/png;base64,"+croppedImage, data);
			signaturePad.value.clearSignature();
		});
	}
};

const cropBase64Image = (base64String) => {
	// Create an Image object from the base64 string
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.src = base64String;
		img.onload = function () {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			let left = canvas.width;
			let right = 0;
			let top = canvas.height;
			let bottom = 0;
			for (let y = 0; y < canvas.height; y++) {
				for (let x = 0; x < canvas.width; x++) {
					const i = (y * canvas.width + x) * 4;
					if (imageData.data[i + 3] !== 0) {
						left = Math.min(left, x);
						right = Math.max(right, x);
						top = Math.min(top, y);
						bottom = Math.max(bottom, y);
					}
				}
			}
			const croppedCanvas = document.createElement("canvas");
			const croppedCtx = croppedCanvas.getContext("2d");
			const croppedWidth = right - left + 1;
			const croppedHeight = bottom - top + 1;
			croppedCanvas.width = croppedWidth;
			croppedCanvas.height = croppedHeight;
			croppedCtx.drawImage(canvas, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
			const croppedBase64String = croppedCanvas.toDataURL("image/png").split(",")[1];
			resolve(croppedBase64String);
		};
		img.onerror = function () {
			reject(new Error('Invalid base64 string.'));
		};
		img.src = `data:image/png;base64,${base64String}`;
	});
}



setTimeout(() => {
	signaturePad.value.resizeCanvas();
}, 25);

</script>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	margin-top: 60px;
}

#signature {
	border: double 3px transparent;
	border-radius: 5px;
	background-image: linear-gradient(white, white),
		radial-gradient(circle at top left, #4bc5e8, #9f6274);
	background-origin: border-box;
	background-clip: content-box, border-box;
}

.container {
	width: "100%";
	padding: 8px 16px;
}

.buttons {
	display: flex;
	gap: 8px;
	justify-content: center;
	margin-top: 8px;
}
</style>
