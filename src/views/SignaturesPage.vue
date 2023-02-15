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
			<div class="container">
				<div class="container">
					<vue-signature-pad id="signature" width="100%" height="500px" ref="signaturePad" />
				</div>
				<div class="buttons">
					<ion-button color="danger" @click="undo">Undo</ion-button>
					<ion-button color="success"  @click="save">Save</ion-button>
				</div>
			</div>
			<ion-item-divider/>
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
import { IonItemDivider,IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonThumbnail, modalController } from '@ionic/vue';
import { ref } from "vue";
import { VueSignaturePad } from "vue-signature-pad";
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
		store.addSignature(image, data);
		signaturePad.value.clearSignature();
	}
};

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
