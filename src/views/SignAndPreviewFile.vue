<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
		<ion-buttons slot="start">
					<ion-back-button default-href="/tabs/files">
					</ion-back-button>
		</ion-buttons>
        <ion-title>Tab 3</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Tab 3</ion-title>
        </ion-toolbar>
      </ion-header>

      <ExploreContainer name="Tab 3 page" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/vue';
import ExploreContainer from '@/components/ExploreContainer.vue';
</script>
