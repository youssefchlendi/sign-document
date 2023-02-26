<template>
	<ion-page>

		<div id="printThis">
			<p>print this to pdf </p>
		</div>
		<ion-button @click="printToPdf()">Print to PDF</ion-button>
	</ion-page>
</template>
<script lang="ts">
import { IonPage, IonButton } from '@ionic/vue';
import { defineComponent } from 'vue'
import { useFilesStore } from '@/store/files.store';
import { degrees, PDFDocument, PDFImage, rgb, StandardFonts } from 'pdf-lib';
import { useSignaturesStore } from '@/store/signatures.store';
import fontkit from '@pdf-lib/fontkit';

export default defineComponent({
	components: { IonPage, IonButton },
	setup() {
		const store = useFilesStore();
		const signatureStore = useSignaturesStore();
		function _base64ToArrayBuffer(base64:string) {
			const removedApplet = base64.replace(/^data:application\/pdf;base64,/, "");
			const binary_string = window.atob(removedApplet);
			const len = binary_string.length;
			const bytes = new Uint8Array(len);
			for (let i = 0; i < len; i++) {
				bytes[i] = binary_string.charCodeAt(i);
			}
			return bytes.buffer;
		}
		const printToPdf = async () => {
			const file = store.files[0];
			// transfer base64 to arraybuffer
			const existingPdfBytes = _base64ToArrayBuffer(file.file);

			const pdfDoc = await PDFDocument.load(existingPdfBytes)

			pdfDoc.registerFontkit(fontkit);
			const ubuntuFontBytes = await fetch(
    '/Amiri-Regular.ttf'
  ).then((res) => res.arrayBuffer());
  const ubuntuFont = await pdfDoc.embedFont(ubuntuFontBytes);

			const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
			const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
			console.log(pdfDoc);

			const pages = pdfDoc.getPages()
			const firstPage = pages[0]
			const { width, height } = firstPage.getSize()
			
			const pdfImage = await pdfDoc.embedPng(signatureStore.signatures[0].signature);
			firstPage.drawImage(
				pdfImage,
				{
					x: 5,
					y: height / 2 + 300,
					width: 50,
					height: 50,
				}
			)

			firstPage.drawText("'تاست'", {
				x: 5,
				y: height / 2 + 300,
				size: 50,
				font: ubuntuFont,
				color: rgb(0.95, 0.1, 0.1),
				rotate: degrees(-45),
			})
			const pdfBytes = await pdfDoc.save();
			// browser download
			window.open(URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' })));
		}

		return { printToPdf }
	}
})
</script>

<style scoped></style>