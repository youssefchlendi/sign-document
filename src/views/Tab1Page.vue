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
					<button @click="undo">Undo</button>
					<button @click="save">Save</button>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';
import ExploreContainer from '@/components/ExploreContainer.vue';
import { ref } from "vue";
import { VueSignaturePad } from "vue-signature-pad";

const signaturePad = ref();

const undo = () => {
	signaturePad.value.undoSignature();
};
const save = () => {
	const { isEmpty, data } = signaturePad.value.saveSignature();

	alert("Open DevTools see the save data.");
	console.log(isEmpty);
	console.log(data);
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
