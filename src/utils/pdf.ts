import { FileSignature } from '@/models/file_signature.model';
import { Signature } from '@/models/Signature.model';
import {useFilesStore} from '@/store/files.store'
import { useSignaturesStore } from '@/store/signatures.store';
import { degrees, PDFDocument, PDFImage, rgb, StandardFonts, translate } from 'pdf-lib';


type FileSignatureJoined = FileSignature & {signature:Signature};

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

export const downloadPdf = async (fileId:number) => {
	const store = useFilesStore();
	const signaturesStore = useSignaturesStore();

	const file = store.getFileById(fileId);
	const fileSignatures = store.file_signature_cache.get(fileId);
	const fileSignaturesJoined:FileSignatureJoined[] = [];

	fileSignatures?.forEach(async (fileSignature:FileSignature) => {
		const signature = await signaturesStore.getSignatureById(fileSignature.signatureId);
		if (signature) {
			fileSignaturesJoined.push({
				...fileSignature,
				signature
			});
		}
	})

	console.log(fileSignaturesJoined);
	if (file){
		const existingPdfBytes = _base64ToArrayBuffer(file.file);

		const pdfDoc = await PDFDocument.load(existingPdfBytes)
		
		const pages = pdfDoc.getPages()
		const firstPage = pages[0]
		
		fileSignaturesJoined.forEach(async (fileSignatureJoined:FileSignatureJoined) => {
			const pdfImage = await pdfDoc.embedPng(fileSignatureJoined.signature.signature);
			console.log(fileSignatureJoined);
			const page = pages[fileSignatureJoined.pageNumber];
			translate(0, firstPage.getHeight());
			
			
			const scale = page.getWidth() / fileSignatureJoined.canvasWidth;
			console.log(scale);
			const { width, height } = page.getSize()

			pages[fileSignatureJoined.pageNumber].drawText(width.toString() + "max x min y", {
				x: width-100,
				y: 0,
				size: 10,
				color: rgb(0.95, 0.1, 0.1),
			})

			pages[fileSignatureJoined.pageNumber].drawText(width.toString() + ', ' + height.toString() + "max x max y", {
				x: width-100,
				y: height-10,
				size: 10,
				color: rgb(0.95, 0.1, 0.1),
			})

			pages[fileSignatureJoined.pageNumber].drawText("0 x 0 y", {
				x: 0,
				y: 0,
				size: 10,
				color: rgb(0.95, 0.1, 0.1),
			})

			pages[fileSignatureJoined.pageNumber].drawText(height.toString() + " 0min x max y", {
				x: 0,
				y: height-10,
				size: 10,
				color: rgb(0.95, 0.1, 0.1),
			})

			pages[fileSignatureJoined.pageNumber].drawImage(
				pdfImage,
				{
					x: fileSignatureJoined.posX,
					y: fileSignatureJoined.posY,
					width: fileSignatureJoined.width*scale,
					height: fileSignatureJoined.height*scale,
				}
			)
			

			// pages[fileSignatureJoined.pageNumber].drawImage(
			// 	pdfImage,
			// 	{
			// 		// x: width-fileSignatureJoined.posX*scale,
			// 		// x:0,
			// 		x: (fileSignatureJoined.posX*scale),
			// 		y: (page.getHeight()-fileSignatureJoined.posY*scale),
			// 		// y: page.getHeight()-fileSignatureJoined.posY*scale,
			// 		// y: 0,
			// 	width: fileSignatureJoined.width*scale,
			// 	height: fileSignatureJoined.height*scale,
			// 	}
			// )
		})
		
		const pdfBytes = await pdfDoc.save();
		// browser download
		window.open(URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' })));
	}
  
}


