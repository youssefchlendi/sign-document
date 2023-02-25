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
			<!-- <div class="footer " v-if="(isPlatform('capacitor')) && !isDragging">
				<ion-slides style="" :pager="false" :options="slideOpts">
					<ion-slide v-if="signatureStore.signatures.length == 0">
						<h1>Slide 1</h1>
					</ion-slide>
					<ion-slide style="height:100px;width:100px;" v-for="sig in signatureStore.signatures" :key="sig.id">
						<ion-img @dragstart="dragmouse($event, sig)"
							@touchstart.prevent="touchstartDrag($event, sig, [], false)" @touchmove="touchmoveDrag"
							@touchend="touchendDrag" style="width:100px;height:100px" class="grabbable square" width="100px"
							height="100px" :draggable="true" :src="sig.signature" />
					</ion-slide>
				</ion-slides>
			</div> -->
			<div id="delete-mobile" class="footer danger-footer"
				v-show="(((isPlatform('capacitor')) ) && isDragging && selectedSection)">
				<h1>
					Drop here to delete
				</h1>
			</div>
			<ion-grid>
				<ion-row>
					<ion-col>
						<div v-if="!isPlatform('capacitor') " class="side-bar">
							<ion-slide v-show="!isDragging" style="height:100px;width:100px;"
								v-for="sig in signatureStore.signatures" :key="sig.id">
								<ion-img @dragstart="dragmouse($event, sig)"
									@touchstart.prevent="touchstartDrag($event, sig, [], false)" @touchmove="touchmoveDrag"
									@touchend="touchendDrag" style="width:100px;height:100px" class="grabbable square"
									width="100px" height="100px" :draggable="true" :src="sig.signature" />
							</ion-slide>
						</div>
					</ion-col>
					<ion-col :size="isPlatform('capacitor')  ? '12' : '10'">
						<!-- centered spinner -->
						<ion-spinner v-show="loading" name="crescent" color="primary"></ion-spinner>
						<div v-show="!loading">
							<ion-item>
								<ion-label>Show all pages</ion-label>
								<ion-checkbox slot="end" v-model="showAllPages"></ion-checkbox>
							</ion-item>
							<div class="pagination" v-if="!showAllPages">
								<ion-button @click="prevPage" :disabled="page == 1">Prev</ion-button>
								<ion-button @click="nextPage" :disabled="page == totalPages">Next</ion-button>
								<p>{{ page }}/{{ totalPages }}</p>
							</div>
						</div>
						<vue-pdf-embed @rendered="handleDocumentRender" :page="page" ref="pdfRef"
							@vnode-updated="initListeners" v-if="pdfFile" :source="pdfFile"></vue-pdf-embed>
					</ion-col>
				</ion-row>

			</ion-grid>
			<ion-fab @click="deleteSignature" color="danger" v-if="selectedSection && !isPlatform('capacitor')" slot="fixed"
				vertical="bottom" horizontal="start">
				<ion-fab-button>
					<ion-icon :icon="pencil"></ion-icon>
				</ion-fab-button>
			</ion-fab>

			<ion-fab @click="signByHand" v-if="selectedPage != -1 && !signingByHand" slot="fixed" vertical="bottom"
				horizontal="end">
				<ion-fab-button>
					<ion-icon :icon="pencil"></ion-icon>
				</ion-fab-button>
			</ion-fab>


			<ion-fab @click="validateSignByHand" v-if="signingByHand" slot="fixed" vertical="bottom" horizontal="end">
				<ion-fab-button color="success">
					<ion-icon :icon="checkmark"></ion-icon>
				</ion-fab-button>
			</ion-fab>
			<ion-fab @click="cancelSignByHand" v-if="signingByHand" slot="fixed" vertical="bottom" horizontal="start">
				<ion-fab-button color="danger">
					<ion-icon :icon="close"></ion-icon>
				</ion-fab-button>
			</ion-fab>





		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { IonItem, IonCheckbox, IonButton, IonSpinner, IonLabel, IonFab, IonFabButton, IonIcon, alertController, IonImg, IonSlides, IonSlide, IonGrid, IonCol, IonRow } from '@ionic/vue';
import { pencil, checkmark, close } from 'ionicons/icons';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton } from '@ionic/vue';
import VuePdfEmbed from 'vue-pdf-embed'
import { useRoute } from 'vue-router';
import { useFilesStore } from '@/store/files.store';
import { ref, onBeforeUnmount, watch } from 'vue';
import { useSignaturesStore } from '@/store/signatures.store';
import jsPDF from 'jspdf';
import { isPlatform } from '@ionic/vue';
import { FileSignature } from '@/models/file_signature.model';
import { fabric } from 'fabric';

const slideOpts = {
	initialSlide: 1,
};
const showAllPages = ref(true);
const selectedSection = ref<HTMLElement>();
const route = useRoute();
const store = useFilesStore();
const pdfFile = ref(route.params.id ? store.getFileById(parseInt(route.params.id as string))?.file : null);
const selectedPage = ref(-1);
const currentPageCanvas = ref<HTMLCanvasElement>();
const currentPageAnnotationLayer = ref<HTMLDivElement>();
const currentPageTextLayer = ref<HTMLDivElement>();
const signatureStore = useSignaturesStore();
const isDragging = ref(false);
const pdfRef = ref();
const page = ref<number | undefined>(undefined);
const totalPages = ref(0);
const loading = ref(true);
const init = ref(false);
const draggedItem = ref<{ fs: FileSignature, section: HTMLElement }>();
const lastDragEvt = ref<DragEvent>();
const selectedFileSignature = ref<FileSignature | undefined>(undefined);
const signingByHand = ref(false);

const cropBase64Image = (base64String: string): Promise<{ img: string, left: number, top: number, right: number, bottom: number }> => {
	// Create an Image object from the base64 string
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.src = base64String;
		img.onload = function () {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			canvas.width = img.width;
			canvas.height = img.height;
			ctx?.drawImage(img, 0, 0);
			const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
			let left = canvas.width;
			let right = 0;
			let top = canvas.height;
			let bottom = 0;
			for (let y = 0; y < canvas.height; y++) {
				for (let x = 0; x < canvas.width; x++) {
					const i = (y * canvas.width + x) * 4;
					if (imageData?.data[i + 3] !== 0) {
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
			croppedCtx?.drawImage(canvas, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
			const croppedBase64String = croppedCanvas.toDataURL("image/png").split(",")[1];
			// eslint-disable-next-line no-self-assign
			left = left;
			// eslint-disable-next-line no-self-assign
			top = top;
			// eslint-disable-next-line no-self-assign
			right = right;
			// eslint-disable-next-line no-self-assign
			bottom = bottom;
			resolve({ img: croppedBase64String, left, top, right, bottom });
		};
		img.onerror = function () {
			reject(new Error('Invalid base64 string.'));
		};
		img.src = `data:image/png;base64,${base64String}`;
	});
}
const validateSignByHand = async () => {
	try {
		// if (isPlatform('capacitor')) {
		const canvas = document.querySelectorAll(`.canvas-container`)[0] as HTMLElement;
		const myCanvasSignature = canvas?.firstChild as HTMLCanvasElement;
		const myDivSelected = document.querySelectorAll(`.selected`)[0] as HTMLElement;

		// get base64 png from myCanvasSignature
		const base64 = myCanvasSignature.toDataURL("image/png").split(",")[1];
		const { img, left, top, right, bottom } = await cropBase64Image(base64);
		const coef = canvas.clientWidth / window.innerWidth;
		const spacingX = (document.querySelectorAll(".vue-pdf-embed")[0] as HTMLElement).offsetLeft * 2;
		// // console.log(spacingX);
		// const scaleCoef = canvasWidth / (windowWidth - spacingX)
		console.log(left, top, right, bottom);
		// // console.log(myDivSelected.offsetTop,myDivSelected.offsetLeft);
		// // console.log(top+myDivSelected.offsetTop,left+myDivSelected.offsetLeft);
		signatureStore.addSignature('data:image/png;base64,' + img, store.getFileById(parseInt(route.params.id as string))?.name + ' - ' + (selectedPage.value + 1))
		// addSignature('data:image/png;base64,'+img,left,top,false,undefined,undefined,undefined,undefined,true)
		// 
		// 
		// 
		const data = 'data:image/png;base64,' + img;
		const canvass = document.createElement('canvas');
		canvass.width = 100;
		canvass.height = 100;
		const ctx = canvass.getContext('2d');
		if (!ctx) {
			return;
		}
		const context = currentPageCanvas.value?.getContext('2d');
		const bi = new Image();
		bi.src = data;
		bi.onload = async () => {
			let droppedX = left;
			let droppedY = top;
			const myDivInsideVuePdfEmbed = document.querySelectorAll('.vue-pdf-embed > div')[selectedPage.value] as HTMLElement;
			const scaleImageCoef = 1;
			bi.width = bi.width * scaleImageCoef;
			bi.height = bi.height * scaleImageCoef;
			const imageWidth = bi.width;
			const imageHeight = bi.height;
			const canvasWidth = currentPageCanvas.value?.width ?? 0;
			const windowWidth = document.body.offsetWidth;
			const spacingX = (document.querySelectorAll(".vue-pdf-embed")[0] as HTMLElement).offsetLeft * 2;
			const scaleCoef = 1;
			// // console.log(scaleCoef);
			// console.log(droppedX,droppedY);
			const mycanva = myDivSelected.querySelector('canvas') as HTMLCanvasElement;
			// console.log(windowWidth,windowWidth/( mycanva.offsetWidth- spacingX));
			// console.log(mycanva.offsetTop,mycanva.offsetLeft,mycanva.offsetWidth,mycanva.offsetHeight);
			// // console.log(droppedX * scaleCoef,droppedY * scaleCoef);
			droppedX = droppedX * scaleCoef;
			droppedY = droppedY * scaleCoef;
			let currentFileSignature: FileSignature | undefined = undefined;
			currentFileSignature = await store.signDocument(parseInt(route.params.id as string), data, droppedX, droppedY, right - left, bottom - top, selectedPage.value, (windowWidth - spacingX), true) ?? undefined;
			// // console.log(currentFileSignature);
			const section = document.createElement('section');
			section.dataset.fileId = currentFileSignature?.fileId.toString();
			section.dataset.posX = currentFileSignature?.posX.toString();
			section.dataset.posY = currentFileSignature?.posY.toString();
			section.dataset.width = currentFileSignature?.width.toString();
			section.dataset.height = currentFileSignature?.height.toString();
			section.dataset.pageNumber = currentFileSignature?.pageNumber.toString();
			section.dataset.signatureId = currentFileSignature?.signatureId.toString();
			section.dataset.pageWidth = currentFileSignature?.pageWidth.toString();
			section.dataset.isHandwritten = currentFileSignature?.isHandwritten.toString();
			section.classList.add('signature');
			section.style.position = 'absolute';
			section.style.top = `${droppedY}px`;
			section.style.left = `${droppedX}px`;
			section.style.width = `${right - left}px`;
			section.style.height = `${bottom - top}px`;
			section.style.zIndex = '100';

			const img = document.createElement('img');
			img.src = data;
			section.appendChild(img);
			currentPageAnnotationLayer.value?.appendChild(section);
			section.onmouseover = () => {
				section.style.filter = 'drop-shadow(0px 0px 5px #890505)';
				section.style.cursor = 'grab';
			}

			section.onmouseout = () => {
				section.style.filter = 'none';
				section.style.cursor = 'default';
			}

			// @dragstart="dragmouse($event, sig)"
			// 								@touchstart.prevent="touchstartDrag($event, sig, [])" @touchmove="touchmoveDrag"
			// 								@touchend="touchendDrag" 

			section.ondragstart = (ev) => {
				console.log('dragstart');
				const datas = ((ev.target as HTMLElement).parentNode) as HTMLElement;
				draggedItem.value = {
					fs: {
						fileId: parseInt(datas.dataset.fileId ?? '0'),
						posX: parseFloat(datas.dataset.posX ?? '0'),
						posY: parseFloat(datas.dataset.posY ?? '0'),
						width: parseFloat(datas.dataset.width ?? '0'),
						height: parseFloat(datas.dataset.height ?? '0'),
						pageNumber: parseInt(datas.dataset.pageNumber ?? '0'),
						signatureId: parseInt(datas.dataset.signatureId ?? '0'),
						pageWidth: parseFloat(datas.dataset.pageWidth ?? '0'),
						isHandwritten: true,
					},
					section: datas,
				}

				dragmouse(ev, { signature: data });
			}

			section.ontouchstart = (ev) => {
				ev.preventDefault();
				// console.log('touchstart');
				selectedSection.value = section;
				selectedFileSignature.value = currentFileSignature;
				const datas = ((ev.target as HTMLElement).parentNode) as HTMLElement;
				draggedItem.value = {
					fs: {
						fileId: parseInt(datas.dataset.fileId ?? '0'),
						posX: parseFloat(datas.dataset.posX ?? '0'),
						posY: parseFloat(datas.dataset.posY ?? '0'),
						width: parseFloat(datas.dataset.width ?? '0'),
						height: parseFloat(datas.dataset.height ?? '0'),
						pageNumber: parseInt(datas.dataset.pageNumber ?? '0'),
						signatureId: parseInt(datas.dataset.signatureId ?? '0'),
						pageWidth: parseFloat(datas.dataset.pageWidth ?? '0'),
						isHandwritten: datas.dataset.isHandwritten == 'true',
					},
					section: datas,
				}
				// // console.log('touchstart');
				// // console.log(selectedFileSignature.value);
				touchstartDrag(ev, { signature: data }, [], true);
			}

			section.ontouchmove = (ev) => {
				touchmoveDrag(ev);
			}

			section.ontouchend = (ev) => {
				touchendDrag(ev);
			}

			section.onclick = (ev) => {
				console.log('click');
				ev.preventDefault();
				ev.stopPropagation();

				if (selectedSection.value) {
					selectedSection.value.style.filter = 'none';
				}
				if (selectedSection.value == section) {
					selectedSection.value = undefined;
					return;
				}
				section.style.filter = 'drop-shadow(0px 0px 5px #890505)';
				selectedSection.value = section;
				selectedFileSignature.value = currentFileSignature;

			}


			signingByHand.value = false
			canvas.remove();
		}
		// }
		// else {
		// 	const canvas = document.querySelectorAll(`.canvas-container`)[0] as HTMLElement;
		// 	const myCanvasSignature = canvas?.firstChild as HTMLCanvasElement;
		// // get base64 png from myCanvasSignature
		// const base64 = myCanvasSignature.toDataURL("image/png").split(",")[1];
		// const {img,left,top,right,bottom} = await cropBase64Image(base64);
		// signatureStore.addSignature('data:image/png;base64,'+img,store.getFileById(parseInt(route.params.id as string))?.name + ' - ' + (selectedPage.value + 1))
		// const data = 'data:image/png;base64,'+img;
		// const windowWidth = document.body.offsetWidth;
		// const canvasWidth =  currentPageCanvas.value?.width ?? 0;
		// const spacingX = (document.querySelectorAll(".vue-pdf-embed")[0] as HTMLElement).offsetLeft * 2;
		// const coef = (canvasWidth / (windowWidth - spacingX));
		// const droppedX = left * coef;
		// const droppedY = top * coef;

		// // let currentFileSignature: FileSignature | undefined = undefined;
		// // currentFileSignature = await store.signDocument(parseInt(route.params.id as string), data, droppedX, droppedY, right-left, bottom-top, selectedPage.value, (windowWidth - spacingX),true) ?? undefined;

		// addSignature('data:image/png;base64,'+img,droppedX,droppedY,false,undefined,undefined,undefined,undefined,false,true)
		// signingByHand.value = false
		// // console.log(canvas);
		// canvas.remove();
		// }
	} catch (error: any) {
		// console.log(error.message);
	}

}
const cancelSignByHand = () => {
	const canvas = document.querySelectorAll(`.canvas-container`)[0] as HTMLElement;
	signingByHand.value = false
	canvas.remove();
}
const signByHand = () => {
	signingByHand.value = true;
	let canvas = document.querySelector(`#canvas${selectedPage.value}`) as HTMLCanvasElement;
	const div = canvas?.parentNode as HTMLElement;
	const canvasCopy = canvas?.cloneNode(true) as HTMLCanvasElement;

	canvas?.parentNode?.append(canvasCopy);

	const myCanvas = new fabric.Canvas(canvas?.parentNode?.lastChild as HTMLCanvasElement, {
		isDrawingMode: true,
		// transparent 
		preserveObjectStacking: true,
		width: canvas.offsetWidth,
		height: canvas.offsetHeight,
	});
	canvas = document.querySelector(`#canvas${selectedPage.value}`) as HTMLCanvasElement;

	const cc = (canvas?.parentNode as HTMLElement).lastChild as HTMLCanvasElement;
	// console.log(canvas.offsetWidth, canvas.offsetHeight);
	// console.log('canvas loaded');
	cc.style.width = canvas.offsetWidth + 'px';
	cc.style.height = canvas.offsetHeight + 'px';
	cc.style.position = 'absolute';
	cc.style.top = '0';
	cc.setAttribute('width', canvas.offsetWidth + 'px');
	cc.setAttribute('height', canvas.offsetHeight + 'px');
	setTimeout(() => {
		// console.log('canvas loaded');
		cc.style.width = canvas.offsetWidth + 'px';
		cc.style.height = canvas.offsetHeight + 'px';
		cc.style.position = 'absolute';
		cc.style.top = '0';
		cc.setAttribute('width', canvas.offsetWidth + 'px');
		cc.setAttribute('height', canvas.offsetHeight + 'px');
	}, 1000);
	// canvas.id = `canvas${index}`;

	// myCanvas.setBackgroundImage(bgImg, myCanvas.renderAll.bind(myCanvas));

}
const handleDocumentRender = () => {
	loading.value = false;
	totalPages.value = pdfRef.value.pageCount;
	loadSignatures();
	// const divsInsideVuePdfEmbed = document.querySelectorAll('.vue-pdf-embed > div');

	// divsInsideVuePdfEmbed.forEach((div: Element, index) => {
	// 	const canvas = div.firstChild as HTMLCanvasElement;
	// 	const canvasCopy = canvas.cloneNode(true) as HTMLCanvasElement;


	// 	canvas.parentNode?.append(canvasCopy);


	// 	const myCanvas = new fabric.Canvas(canvas.parentNode?.lastChild as HTMLCanvasElement, {
	// 		isDrawingMode: true,
	// 		// transparent 
	// 		preserveObjectStacking: true

	// 	});

	// 	const cc = div.lastChild as HTMLCanvasElement;
	// 	cc.style.width = canvas.style.width;
	// 	cc.style.height = canvas.style.height;
	// 	cc.style.position = 'absolute';
	// 	cc.style.top = '0';

	// 	// canvas.id = `canvas${index}`;

	// 	// myCanvas.setBackgroundImage(bgImg, myCanvas.renderAll.bind(myCanvas));

	// });
}


watch(
	showAllPages,
	(val) => {
		if (val) {
			page.value = undefined;
			return;
		}
		page.value = 1;
	}
);

const prevPage = () => {
	if (page.value) {
		page.value = page.value - 1;
		return;
	}
	page.value = 1;
}

const nextPage = () => {
	if (page.value) {
		page.value = page.value + 1;
		return;
	}
	page.value = 1;
}


const initListeners = () => {
	const divsInsideVuePdfEmbed = document.querySelectorAll('.vue-pdf-embed > div');

	divsInsideVuePdfEmbed.forEach((div: Element, index) => {
		const canvas = div.firstChild as HTMLCanvasElement;
		canvas.id = `canvas${index}`;


		canvas.classList.add('myCanvas');
		canvas.addEventListener('dragover', (ev) => {
			canvas.classList.add('dragover');
			ev.preventDefault();
		});
		canvas.addEventListener('drop', (ev) => {
			console.log('drop');
			if (draggedItem.value) {
				store.deleteSignature(draggedItem.value.fs);
				draggedItem.value.section.remove();
			}
			if (lastDragEvt.value == ev) {
				return;
			}
			lastDragEvt.value = ev;
			canvas.classList.remove('dragover');
			div.children[1].classList.remove('hide');
			ev.preventDefault();
			selectedPage.value = index;
			currentPageCanvas.value = div.firstChild as HTMLCanvasElement;
			currentPageAnnotationLayer.value = div.children[2] as HTMLDivElement;
			currentPageTextLayer.value = div.children[1] as HTMLDivElement;
			const data = ev.dataTransfer?.getData('text');
			// console.log("data");
			// console.log(ev);
			addSignature(data as string, ev.offsetX, ev.offsetY);
		});

		div.addEventListener('dragover', () => {
			div.children[1].classList.add('hide');
		});

		canvas.addEventListener('dragleave', (ev) => {
			ev.preventDefault();
			div.children[1].classList.remove('hide');
		});

		canvas.addEventListener('mouseleave', (ev) => {
			ev.preventDefault();
			div.children[1].classList.remove('hide');
		});
		div.addEventListener('click', () => {
			if (signingByHand.value) {
				return;
			}
			if (selectedPage.value != index) {
				divsInsideVuePdfEmbed[selectedPage.value]?.classList.remove('selected');
				selectedPage.value = index;
				divsInsideVuePdfEmbed[selectedPage.value].classList.add('selected');
				currentPageCanvas.value = div.firstChild as HTMLCanvasElement;
				currentPageAnnotationLayer.value = div.children[2] as HTMLDivElement;
				currentPageTextLayer.value = div.children[1] as HTMLDivElement;
			} else {
				divsInsideVuePdfEmbed[selectedPage.value].classList.remove('selected');
				selectedPage.value = -1;
			}
		});
	});
}

const addSignature = (data: string, x: number, y: number, init = false, initAnnotationLayer: (HTMLDivElement | undefined) = undefined, initCanvasLayer: (HTMLCanvasElement | undefined) = undefined, initTextLayer: (HTMLDivElement | undefined) = undefined, fileSignature: (FileSignature | undefined) = undefined, drawingMobile = false, isHandSignature = false) => {
	const canvas = document.createElement('canvas');
	canvas.width = 100;
	canvas.height = 100;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return;
	}
	const context = init ? initCanvasLayer?.getContext('2d') : currentPageCanvas.value?.getContext('2d');
	const bi = new Image();
	bi.src = data;
	bi.onload = async () => {
		const droppedX = x;
		const droppedY = y;
		const myDivInsideVuePdfEmbed = document.querySelectorAll('.vue-pdf-embed > div')[selectedPage.value] as HTMLElement;
		// drawingMobile?droppedX=droppedX+myDivInsideVuePdfEmbed.offsetTop:null;
		// drawingMobile?droppedY=droppedY+myDivInsideVuePdfEmbed.offsetLeft:null;
		const scaleImageCoef = 1;
		bi.width = bi.width * scaleImageCoef;
		bi.height = bi.height * scaleImageCoef;
		const imageWidth = bi.width;
		const imageHeight = bi.height;
		const canvasWidth = init ? (initCanvasLayer?.width ?? 0) : currentPageCanvas.value?.width ?? 0;
		const canvasHeight = init ? (initCanvasLayer?.height ?? 0) : currentPageCanvas.value?.height ?? 0;
		const windowWidth = document.body.offsetWidth;
		const windowHeight = document.body.offsetHeight;
		// // console.log(x, y);
		// // console.log(canvasWidth, canvasHeight);
		// // console.log(windowWidth, windowHeight);
		const spacingX = (document.querySelectorAll(".vue-pdf-embed")[0] as HTMLElement).offsetLeft * 2;
		// // console.log(spacingX);
		const scaleCoef = canvasWidth / (windowWidth - spacingX)

		let canvasId = 0;
		if (showAllPages.value) {
			canvasId = parseInt(currentPageCanvas.value?.id.match(/\d+/g)![0] ?? '0');
		} else {
			canvasId = page.value ? (page.value - 1 < 0 ? 0 : page.value - 1) : 0;
		}
		let currentFileSignature: FileSignature | undefined = undefined;
		if (!init) {
			debugger;

			console.log('dropped', imageWidth, imageHeight, draggedItem.value?.fs.isHandwritten);
			currentFileSignature = await store.signDocument(parseInt(route.params.id as string), data, droppedX, droppedY, draggedItem.value?.fs.isHandwritten ? draggedItem.value?.fs.width : 100, draggedItem.value?.fs.isHandwritten ? draggedItem.value?.fs.height : 100, canvasId, (windowWidth - spacingX), draggedItem.value?.fs.isHandwritten ? draggedItem.value?.fs.isHandwritten : isHandSignature) ?? undefined;
		}
		// // console.log(currentFileSignature);
		const section = document.createElement('section');
		section.dataset.fileId = draggedItem.value ? draggedItem.value.fs.fileId.toString() : (!init ? currentFileSignature?.fileId.toString() : fileSignature?.fileId.toString());
		section.dataset.posX = draggedItem.value ? draggedItem.value.fs.posX.toString() : (!init ? currentFileSignature?.posX.toString() : fileSignature?.posX.toString());
		section.dataset.posY = draggedItem.value ? draggedItem.value.fs.posY.toString() : (!init ? currentFileSignature?.posY.toString() : fileSignature?.posY.toString());
		section.dataset.width = draggedItem.value ? draggedItem.value.fs.width.toString() : (!init ? currentFileSignature?.width.toString() : fileSignature?.width.toString());
		section.dataset.height = draggedItem.value ? draggedItem.value.fs.height.toString() : (!init ? currentFileSignature?.height.toString() : fileSignature?.height.toString());
		section.dataset.pageNumber = draggedItem.value ? draggedItem.value.fs.pageNumber.toString() : (!init ? currentFileSignature?.pageNumber.toString() : fileSignature?.pageNumber.toString());
		section.dataset.signatureId = draggedItem.value ? draggedItem.value.fs.signatureId.toString() : (!init ? currentFileSignature?.signatureId.toString() : fileSignature?.signatureId.toString());
		section.dataset.pageWidth = draggedItem.value ? draggedItem.value.fs.pageWidth.toString() : (!init ? currentFileSignature?.pageWidth.toString() : fileSignature?.pageWidth.toString());
		section.dataset.isHandwritten = draggedItem.value ? draggedItem.value.fs.isHandwritten.toString() : (!init ? currentFileSignature?.isHandwritten.toString() : fileSignature?.isHandwritten.toString());
		section.classList.add('signature');
		section.style.position = 'absolute';
		section.style.top = (draggedItem.value?.fs.isHandwritten || drawingMobile) ? `${droppedY}px` : `${droppedY - imageHeight / 4}px`;
		section.style.left = (draggedItem.value?.fs.isHandwritten || drawingMobile) ? `${droppedX}px` : `${droppedX - imageWidth / 4}px`;
		const img = document.createElement('img');
		img.src = data;
		if (draggedItem.value?.fs?.isHandwritten || currentFileSignature?.isHandwritten || fileSignature?.isHandwritten) {
			const width = draggedItem.value?.fs?.isHandwritten ? draggedItem.value?.fs?.pageWidth : (currentFileSignature?.pageWidth ? currentFileSignature?.pageWidth : fileSignature?.pageWidth)??0;
			const coef =  (window.innerWidth-spacingX) / width;
			console.log(coef);
			console.log(`${draggedItem.value?.fs?.isHandwritten ? draggedItem.value?.fs?.width : (currentFileSignature?.width ? currentFileSignature?.width : (fileSignature?.width??1))}px`);
			
			section.style.top = (draggedItem.value?.fs.isHandwritten || drawingMobile) ? `${(droppedY*coef)}px` : `${droppedY - imageHeight / 4}px`;
			section.style.left = (draggedItem.value?.fs.isHandwritten || drawingMobile) ? `${(droppedX*coef)}px` : `${droppedX - imageWidth / 4}px`;
			
			img.style.maxWidth = `${draggedItem.value?.fs?.isHandwritten ? draggedItem.value?.fs?.width*coef : (currentFileSignature?.width ? currentFileSignature?.width*coef : (fileSignature?.width??1)*coef)}px`;
			img.style.maxHeight = `${draggedItem.value?.fs?.isHandwritten ? draggedItem.value?.fs?.height*coef : (currentFileSignature?.height ? currentFileSignature?.height*coef : (fileSignature?.height??1)*coef)}px`;
			section.style.width = `${draggedItem.value?.fs?.isHandwritten ? draggedItem.value?.fs?.width*coef : (currentFileSignature?.width ? currentFileSignature?.width*coef : (fileSignature?.width??1)*coef)}px`;
			section.style.height = `${draggedItem.value?.fs?.isHandwritten ? draggedItem.value?.fs?.height*coef : (currentFileSignature?.height ? currentFileSignature?.height*coef : (fileSignature?.height??1)*coef)}px`;
		} else {

			section.style.width = `${init ? (initAnnotationLayer?.offsetWidth ?? 0) * 0.1 : currentPageAnnotationLayer.value!.offsetWidth * 0.1}px`;
			section.style.height = `${bi.height * 0.1}px`;
		}
		section.style.zIndex = '100';
		section.onmouseover = () => {
			section.style.filter = 'drop-shadow(0px 0px 5px #890505)';
			section.style.cursor = 'grab';
		}

		section.onmouseout = () => {
			section.style.filter = 'none';
			section.style.cursor = 'default';
		}

		// @dragstart="dragmouse($event, sig)"
		// 								@touchstart.prevent="touchstartDrag($event, sig, [])" @touchmove="touchmoveDrag"
		// 								@touchend="touchendDrag" 

		section.ondragstart = (ev) => {
			// console.log('dragstart');
			const datas = ((ev.target as HTMLElement).parentNode) as HTMLElement;
			draggedItem.value = {
				fs: {
					fileId: parseInt(datas.dataset.fileId ?? '0'),
					posX: parseFloat(datas.dataset.posX ?? '0'),
					posY: parseFloat(datas.dataset.posY ?? '0'),
					width: parseFloat(datas.dataset.width ?? '0'),
					height: parseFloat(datas.dataset.height ?? '0'),
					pageNumber: parseInt(datas.dataset.pageNumber ?? '0'),
					signatureId: parseInt(datas.dataset.signatureId ?? '0'),
					pageWidth: parseFloat(datas.dataset.pageWidth ?? '0'),
					isHandwritten: datas.dataset.isHandwritten === 'true',
				},
				section: datas,
			}

			dragmouse(ev, { signature: data });
		}

		section.ontouchstart = (ev) => {
			ev.preventDefault();
			// console.log('touchstart');
			selectedSection.value = section;
			selectedFileSignature.value = fileSignature;
			const datas = ((ev.target as HTMLElement).parentNode) as HTMLElement;
			draggedItem.value = {
				fs: {
					fileId: parseInt(datas.dataset.fileId ?? '0'),
					posX: parseFloat(datas.dataset.posX ?? '0'),
					posY: parseFloat(datas.dataset.posY ?? '0'),
					width: parseFloat(datas.dataset.width ?? '0'),
					height: parseFloat(datas.dataset.height ?? '0'),
					pageNumber: parseInt(datas.dataset.pageNumber ?? '0'),
					signatureId: parseInt(datas.dataset.signatureId ?? '0'),
					pageWidth: parseFloat(datas.dataset.pageWidth ?? '0'),
					isHandwritten: datas.dataset.isHandwritten === 'true',
				},
				section: datas,
			}
			// // console.log('touchstart');
			// // console.log(selectedFileSignature.value);
			touchstartDrag(ev, { signature: data }, [], true);
		}

		section.ontouchmove = (ev) => {
			touchmoveDrag(ev);
		}

		section.ontouchend = (ev) => {
			touchendDrag(ev);
		}

		section.onclick = (ev) => {
			// console.log('click');
			ev.preventDefault();
			ev.stopPropagation();

			if (selectedSection.value) {
				selectedSection.value.style.filter = 'none';
			}
			if (selectedSection.value == section) {
				selectedSection.value = undefined;
				return;
			}
			section.style.filter = 'drop-shadow(0px 0px 5px #890505)';
			selectedSection.value = section;
			selectedFileSignature.value = !init ? currentFileSignature : fileSignature;

		}



		
		// img.style.width = `${currentPageAnnotationLayer.value!.offsetWidth*0.1}px`;
		// img.style.height = `${bi.height*0.1}px`;
		section.appendChild(img);
		// section.appendChild(bi);
		// currentPageAnnotationLayer.value?.querySelectorAll('.signature').forEach((el) => {
		// 	el.remove();
		// });
		// // console.log('i"m here ');
		// // console.log(currentPageAnnotationLayer.value);
		init ? initAnnotationLayer?.appendChild(section) : currentPageAnnotationLayer.value?.appendChild(section);
		// // console.log(currentPageAnnotationLayer.value);
		// get numeric part from string using regex
		// example : canvas1 => 1, canvas2 => 2


		// // console.log(store.file_signature_cache);
		// context?.drawImage(bi, (droppedX - imageWidth / 4) * scaleCoef, (droppedY - imageHeight / 4) * scaleCoef,150,150);
	}
	// context?.drawImage()
	// currentPageCanvas.value?.appendChild(canvas);

}


const deleteSignature = () => {

	alertController.create(
		{
			header: 'Delete Signature',
			message: 'Are you sure you want to delete this signature?',
			buttons: [
				{
					text: 'Cancel',
					role: 'cancel',
					cssClass: 'secondary',
					handler: () => {
						// // console.log('Confirm Cancel');
					}
				}, {
					text: 'Okay',
					handler: () => {
						selectedSection.value?.remove();
						if (selectedFileSignature.value) {
							store.deleteSignature(selectedFileSignature.value);
							loadSignatures();
						}
						selectedSection.value = undefined;
					}
				}
			]
		}
	).then((alert) => {
		alert.present();
	}
	)

}

const loadSignatures = async () => {
	// console.log('loadSignatures');
	try {
		const signatures = store.file_signature_cache?.get(parseInt(route.params?.id as string));
		if (showAllPages.value) {
			signatures?.forEach(async (sig: FileSignature) => {
				// // console.log(index);
				const signature = await signatureStore.getSignatureById(sig.signatureId);

				if (signature) {

					const initCanvas = document.querySelector(`#canvas${sig.pageNumber}`) as HTMLCanvasElement;
					const initText = document.querySelector(`#canvas${sig.pageNumber}`)?.parentNode?.querySelector('.textLayer') as HTMLDivElement;
					const initAnnotation = document.querySelector(`#canvas${sig.pageNumber}`)?.parentNode?.querySelector('.annotationLayer') as HTMLDivElement;
					// // console.log(sig.pageNumber);
					await addSignature(signature.signature, sig.posX, sig.posY, true, initAnnotation, initCanvas, initText, sig, sig.isHandwritten, sig.isHandwritten);
				}
			})
		} else {
			const sig = signatures?.filter((sig: FileSignature) => sig.pageNumber + 1 == page.value);
			sig.forEach(async (sigi: FileSignature) => {
				const signature = await signatureStore.getSignatureById(sigi.signatureId);
				if (signature) {
					const initCanvas = document.querySelector(`#canvas0`) as HTMLCanvasElement;
					const initText = document.querySelector(`#canvas0`)?.parentNode?.querySelector('.textLayer') as HTMLDivElement;
					const initAnnotation = document.querySelector(`#canvas0`)?.parentNode?.querySelector('.annotationLayer') as HTMLDivElement;
					addSignature(signature.signature, sigi.posX, sigi.posY, true, initAnnotation, initCanvas, initText, sigi, sigi.isHandwritten, sigi.isHandwritten);
				}
			})
		}
	} catch (error) {
		// // console.log(error);
	}
}

onBeforeUnmount(() => {
	const divsInsideVuePdfEmbed = document.querySelectorAll('.vue-pdf-embed > div');
	divsInsideVuePdfEmbed.forEach((div: Element) => {
		div.removeEventListener('click', () => {
			div.classList.remove('selected');
		});
	});
});

/**
 * 
 */

const dragmouse = (e: any, item: any) => {
	e.dataTransfer.dropEffect = 'move'
	e.dataTransfer.effectAllowed = 'move'
	e.dataTransfer.setData('item', item)
};



const touchY = ref(0)
const touchX = ref(0)
const touchDragItem = ref<any>()

const touchstartDrag = (e: any, item: any, arr: any, fromSection: boolean) => {
	isDragging.value = true;
	const image = document.createElement("img"); // Create a new element
	image.setAttribute("id", "image-float");


	// get the image from the stored reference
	image.src = item.signature;
	image.width = isPlatform('capacitor') && fromSection ? 50 : 100;
	image.height = isPlatform('capacitor') && fromSection ? 50 : 100;

	// position the image to the touch, can be improve to detect the position of touch inside the image
	const left = e.touches[0].pageX;
	const top = e.touches[0].pageY;
	image.style.position = 'absolute'
	image.style.left = left + 'px';
	image.style.top = top + 'px';

	touchDragItem.value = image

	document.getElementById('app')?.appendChild(image);
};

const touchmoveDrag = (e: any) => {

	// on touch move or dragging, we get the newly created image element
	const image = document.getElementById('image-float')
	// this will give us the dragging feeling of the element while actually it's a different element
	const left = e.touches[0].pageX;
	const top = e.touches[0].pageY;
	image!.style.position = 'absolute'
	image!.style.left = left + 'px';
	image!.style.top = top + 'px';
	touchX.value = e.touches[0].pageX
	touchY.value = e.touches[0].pageY

};
const touchendDrag = (e: TouchEvent) => {
	// // console.log('touchend');
	(touchDragItem.value as HTMLImageElement).remove();
	// // console.log(e);
	const deleteMobile = document.getElementById('delete-mobile');
	const minXDeleteMobile = deleteMobile?.getBoundingClientRect().left;
	const maxXDeleteMobile = deleteMobile?.getBoundingClientRect().right;
	const minYDeleteMobile = deleteMobile?.getBoundingClientRect().top;
	const maxYDeleteMobile = deleteMobile?.getBoundingClientRect().bottom;
	const touchX = e.changedTouches[0].clientX;
	const touchY = e.changedTouches[0].clientY;
	const overlap = !(maxXDeleteMobile! < touchX ||
		minXDeleteMobile! > touchX ||
		maxYDeleteMobile! < touchY ||
		minYDeleteMobile! > touchY)
	// // console.log('overlap', overlap);
	// // console.log('selectedSection', selectedSection.value);
	const mySection = ((e.target as HTMLElement).parentNode as HTMLElement);
	if (overlap && selectedSection.value) {
		selectedSection.value.remove();
		isDragging.value = false;
		const fileSignatureFromSection: FileSignature = {
			fileId: parseInt(mySection?.dataset.fileId as string),
			posX: parseFloat(mySection?.dataset.posX as string),
			posY: parseFloat(mySection?.dataset.posY as string),
			width: parseFloat(mySection?.dataset.width as string),
			height: parseFloat(mySection?.dataset.height as string),
			pageNumber: parseInt(mySection?.dataset.pageNumber as string),
			signatureId: parseInt(mySection?.dataset.signatureId as string),
			pageWidth: parseFloat(mySection?.dataset.pageWidth as string),
			isHandwritten: mySection?.dataset.isHandwritten === 'true',
		}

		// // console.log('fileSignatureFromSection')
		// // console.log(fileSignatureFromSection)
		store.deleteSignature(fileSignatureFromSection);

		// selectedFileSignature.value
		selectedSection.value = undefined;
		// // console.log('delete');
		return;
	}
	const myCanvases = document.querySelectorAll('canvas');
	myCanvases.forEach((canvas: HTMLCanvasElement) => {
		const canvasRect = canvas.getBoundingClientRect();
		const touchX = e.changedTouches[0].clientX;
		const touchY = e.changedTouches[0].clientY;
		const overlap = !(canvasRect.right < touchX ||
			canvasRect.left > touchX ||
			canvasRect.bottom < touchY ||
			canvasRect.top > touchY)
		if (overlap) {
			if (draggedItem.value) {
				store.deleteSignature(draggedItem.value.fs);
				draggedItem.value.section.remove();
			}
			currentPageCanvas.value = canvas;
			currentPageAnnotationLayer.value = canvas.parentElement!.querySelector('.annotationLayer') as HTMLDivElement;
			currentPageTextLayer.value = canvas.parentElement!.querySelector('.textLayer') as HTMLDivElement;
			addSignature((touchDragItem.value as HTMLImageElement).src, touchX - canvasRect.left, touchY - canvasRect.top, false, undefined, undefined, undefined, undefined, mySection?.dataset.isHandwritten === 'true', mySection?.dataset.isHandwritten === 'true');
		}
	});


	isDragging.value = false;

}

</script>
<style>
.vue-pdf-embed {
	width: 95% !important;
	margin: 0 auto;
}

.vue-pdf-embed>div {
	margin: 1rem 0;
}

.vue-pdf-embed>div>canvas {
	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
}

.selected {
	box-shadow: 0 0 10px 0 rgba(128, 65, 65, 0.5) !important;
}

.hover {
	box-shadow: 0 0 10px 0 rgba(128, 65, 65, 0.5) !important;
}

.dragover {
	box-shadow: 0 0 10px 0 rgb(229, 255, 0) !important;
	cursor: grabbing !important;
	cursor: -moz-grabbing !important;
	cursor: -webkit-grabbing !important;
}

.grabbable {
	cursor: move;
	/* fallback if grab cursor is unsupported */
	cursor: grab;
	cursor: -moz-grab;
	cursor: -webkit-grab;
}

/* (Optional) Apply a "closed-hand" cursor during drag operation. */
.grabbable:active {
	cursor: grabbing;
	cursor: -moz-grabbing;
	cursor: -webkit-grabbing;
}

.hide {
	display: none !important;
}

.square {
	width: 150px;
	height: 150px;
}

.sigCont {
	position: fixed;
	bottom: 0;
	left: 0;
	z-index: 100;
}

.footer {
	position: fixed;
	bottom: 0;
	left: 0;
	z-index: 100;
	/*  center */
	width: 100%;
	text-align: center;
	background-color: rgb(112 112 112 / 40%);
	display: flex;
	justify-content: center;
	align-items: center;
}

.split {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: row;
}

.side-bar {
	border-radius: 10px;
	position: fixed;
	box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
	padding: 1rem;
	max-height: 80%;
	overflow-y: auto;
}

.danger-footer {
	position: fixed !important;
	background-color: rgb(255 0 0 / 40%);
	z-index: 1000;


}

.dragover {
	box-shadow: 0 0 10px 0 rgb(229, 255, 0) !important;
	cursor: grabbing !important;
	cursor: -moz-grabbing !important;
	cursor: -webkit-grabbing !important;
}
</style>
