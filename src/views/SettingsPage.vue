<template>
	<ion-page>

		<div id="printThis">
      <p>print this to pdf	</p>
	</div>
	<ion-button @click="printToPdf()">Print to PDF</ion-button>
</ion-page>
</template>
<script lang="ts">
import {IonPage, IonButton} from '@ionic/vue';
import { defineComponent } from 'vue'
import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';

export default defineComponent({
	components: {IonPage, IonButton},
	setup () {
		const printToPdf = () => {
			const element = document.getElementById('printThis') as HTMLElement;
			// const opt = {
			// 	margin: 1,
			// 	filename: 'myfile.pdf',
			// 	image: { type: 'sad', quality: 0.98 },
			// 	html2canvas: { scale: 2 },
			// 	jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
			// };
			// html2pdf(
			// 	element,
			// 	opt
			// )
			const doc = new jsPDF();
			doc.html(element, {
				callback: function (doc) {
					doc.save('a4.pdf');
				}
			});


		}

		return {printToPdf}
	}
})
</script>

<style scoped>

</style>