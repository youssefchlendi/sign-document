<template>
	<ion-page>
		<ion-tabs>
			<ion-router-outlet></ion-router-outlet>
			<ion-tab-bar slot="bottom">
				<ion-tab-button tab="tab1" href="/tabs/signatures">
					<ion-icon :icon="pencil" />
					<ion-label>Signatures</ion-label>
				</ion-tab-button>

				<ion-tab-button tab="tab2" href="/tabs/files">
					<ion-icon :icon="document" />
					<ion-label>Documents</ion-label>
				</ion-tab-button>

				<ion-tab-button tab="tab3" href="/tabs/settings">
					<ion-icon :icon="square" />
					<ion-label>Tab 3</ion-label>
				</ion-tab-button>
			</ion-tab-bar>
		</ion-tabs>
	</ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { ellipse, square, document, pencil } from 'ionicons/icons';
</script>
