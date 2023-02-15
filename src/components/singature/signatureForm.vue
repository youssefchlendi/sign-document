<template>
	<ion-header>
		<ion-toolbar>
			<ion-buttons slot="start">
				<ion-button color="medium" @click="cancel">Cancel</ion-button>
			</ion-buttons>
			<ion-title>Create signature</ion-title>
			<ion-buttons slot="end">
				<ion-button @click="confirm">Confirm</ion-button>
			</ion-buttons>
		</ion-toolbar>
	</ion-header>
	<ion-content class="ion-padding">
		<ion-item>
			<ion-label position="stacked">The signature title</ion-label>
			<ion-input v-model="name" placeholder="signature title"></ion-input>
		</ion-item>
	</ion-content>
</template>

<script lang="ts">
import {
	IonContent,
	IonHeader,
	IonTitle,
	IonToolbar,
	IonButtons,
	IonButton,
	IonItem,
	IonLabel,
	IonInput,
	modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'SignatureForm',
	components: { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonItem, IonLabel, IonInput },
	data() {
		return {
			name: '',
		};
	},
	methods: {
		cancel() {
			return modalController.dismiss(null, 'cancel');
		},
		confirm() {
			console.log(this.name);
			return modalController.dismiss(this.name, 'confirm');
		},
	},
});
</script>