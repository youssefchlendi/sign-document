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
				v-show="(((isPlatform('capacitor'))) && isDragging && selectedSection)">
				<h1>
					Drop here to delete
				</h1>
			</div>
			<ion-grid>
				<ion-row>
					<ion-col>
						<div v-if="!isPlatform('capacitor')" class="side-bar">
							<ion-slide v-show="!isDragging" style="height:100px;width:100px;"
								v-for="sig in signatureStore.signatures" :key="sig.id">
								<ion-img @dragstart="dragmouse($event, sig)"
									@touchstart.prevent="touchstartDrag($event, sig, [], false)" @touchmove="touchmoveDrag"
									@touchend="touchendDrag" style="width:100px;height:100px" class="grabbable square"
									width="100px" height="100px" :draggable="true" :src="sig.signature" />
							</ion-slide>
						</div>
					</ion-col>
					<ion-col :size="isPlatform('capacitor') ? '12' : '10'">
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
import { isPlatform } from '@ionic/vue';
import { FileSignature } from '@/models/file_signature.model';
import { fabric } from 'fabric';
import { cropBase64Image } from '@/utils/crop';

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
const draggedItem = ref<{ fs: FileSignature, section: HTMLElement }>();
const lastDragEvt = ref<DragEvent>();
const selectedFileSignature = ref<FileSignature | undefined>(undefined);
const signingByHand = ref(false);


const validateSignByHand = async () => {
	try {
		const canvas = document.querySelectorAll(`.canvas-container`)[0] as HTMLElement;
		const myCanvasSignature = canvas?.firstChild as HTMLCanvasElement;

		const base64 = myCanvasSignature.toDataURL("image/png").split(",")[1];
		const { img, left, top, right, bottom } = await cropBase64Image(base64);

		signatureStore.addSignature('data:image/png;base64,' + img, store.getFileById(parseInt(route.params.id as string))?.name + ' - ' + (selectedPage.value + 1))

		const data = 'data:image/png;base64,' + img;
		const canvass = document.createElement('canvas');
		canvass.width = 100;
		canvass.height = 100;
		const ctx = canvass.getContext('2d');
		if (!ctx) {
			return;
		}
		const bi = new Image();
		bi.src = data;
		bi.onload = async () => {
			let droppedX = left;
			let droppedY = top;
			const scaleImageCoef = 1;
			bi.width = bi.width * scaleImageCoef;
			bi.height = bi.height * scaleImageCoef;
			const windowWidth = document.body.offsetWidth;
			const spacingX = (document.querySelectorAll(".vue-pdf-embed")[0] as HTMLElement).offsetLeft * 2;
			const scaleCoef = 1;
			droppedX = droppedX * scaleCoef;
			droppedY = droppedY * scaleCoef;
			const currentFileSignature: FileSignature | undefined = await store.signDocument(parseInt(route.params.id as string), data, droppedX, droppedY, right - left, bottom - top, selectedPage.value, (windowWidth - spacingX), true) ?? undefined;
			createAndAppendSection(currentFileSignature, droppedY, droppedX, right, left, bottom, top, data);

			signingByHand.value = false
			canvas.remove();
		}
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
	const canvasCopy = canvas?.cloneNode(true) as HTMLCanvasElement;

	canvas?.parentNode?.append(canvasCopy);

	new fabric.Canvas(canvas?.parentNode?.lastChild as HTMLCanvasElement, {
		isDrawingMode: true,
		preserveObjectStacking: true,
		width: canvas.offsetWidth,
		height: canvas.offsetHeight,
	});
	canvas = document.querySelector(`#canvas${selectedPage.value}`) as HTMLCanvasElement;

	const cc = (canvas?.parentNode as HTMLElement).lastChild as HTMLCanvasElement;
	cc.style.position = 'absolute';
	cc.style.top = '0';

}
const handleDocumentRender = () => {
	loading.value = false;
	totalPages.value = pdfRef.value.pageCount;
	loadSignatures();
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
			debugger;
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
	const bi = new Image();
	bi.src = data;
	bi.onload = async () => {
		const droppedX = x;
		const droppedY = y;
		const scaleImageCoef = 1;
		bi.width = bi.width * scaleImageCoef;
		bi.height = bi.height * scaleImageCoef;
		const imageWidth = bi.width;
		const imageHeight = bi.height;
		const windowWidth = document.body.offsetWidth;
		const spacingX = (document.querySelectorAll(".vue-pdf-embed")[0] as HTMLElement).offsetLeft * 2;

		let canvasId = 0;
		if (showAllPages.value) {
			const idParsed = currentPageCanvas.value?.id.match(/\d+/g);
			if(!idParsed) {
				return;
			}
			canvasId = parseInt(idParsed[0] ?? '0');
		} else {
			canvasId = page.value ? (page.value - 1 < 0 ? 0 : page.value - 1) : 0;
		}
		let currentFileSignature: FileSignature | undefined = undefined;
		if (!init) {
			currentFileSignature = await store.signDocument(parseInt(route.params.id as string), data, droppedX, droppedY, draggedItem.value?.fs.isHandwritten ? draggedItem.value?.fs.width : 100, draggedItem.value?.fs.isHandwritten ? draggedItem.value?.fs.height : 100, canvasId, (windowWidth - spacingX), draggedItem.value?.fs.isHandwritten ? draggedItem.value?.fs.isHandwritten : isHandSignature) ?? undefined;
		}
		const section = document.createElement('section');
		const _fileSignature = draggedItem.value ? draggedItem.value.fs : (init ? fileSignature : currentFileSignature);
		fillSectionDataset(section, _fileSignature);
		section.classList.add('signature');
		section.style.position = 'absolute';
		section.style.top = (draggedItem.value?.fs.isHandwritten || drawingMobile) ? `${droppedY}px` : `${droppedY - imageHeight / 4}px`;
		section.style.left = (draggedItem.value?.fs.isHandwritten || drawingMobile) ? `${droppedX}px` : `${droppedX - imageWidth / 4}px`;
		const img = document.createElement('img');
		img.src = data;
		if (_fileSignature?.isHandwritten) {
			const width = _fileSignature.pageWidth ?? 1;
			const coef = (window.innerWidth - spacingX) / width;
			console.log(coef);

			section.style.top = (draggedItem.value?.fs.isHandwritten || drawingMobile) ? `${(droppedY * coef)}px` : `${droppedY - imageHeight / 4}px`;
			section.style.left = (draggedItem.value?.fs.isHandwritten || drawingMobile) ? `${(droppedX * coef)}px` : `${droppedX - imageWidth / 4}px`;

			img.style.maxWidth = `${(_fileSignature.width ?? 1) * coef}px`;
			img.style.maxHeight = `${(_fileSignature.height ?? 1) * coef}px`;
			section.style.width = `${(_fileSignature.width ?? 1) * coef}px`;
			section.style.height = `${(_fileSignature.height ?? 1) * coef}px`;
		} else {

			section.style.width = `${init ? (initAnnotationLayer?.offsetWidth ?? 0) * 0.1 : currentPageAnnotationLayer.value?.offsetWidth??0 * 0.1}px`;
			section.style.height = `${bi.height * 0.1}px`;
		}
		section.style.zIndex = '100';

		addEventListenersToSection(section, data, _fileSignature);


		section.appendChild(img);
		init ? initAnnotationLayer?.appendChild(section) : currentPageAnnotationLayer.value?.appendChild(section);
	}

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
	try {
		const signatures = store.file_signature_cache?.get(parseInt(route.params?.id as string));
		if (showAllPages.value) {
			signatures?.forEach(async (sig: FileSignature) => {
				const signature = await signatureStore.getSignatureById(sig.signatureId);
				if (signature) {
					const initCanvas = document.querySelector(`#canvas${sig.pageNumber}`) as HTMLCanvasElement;
					const initText = document.querySelector(`#canvas${sig.pageNumber}`)?.parentNode?.querySelector('.textLayer') as HTMLDivElement;
					const initAnnotation = document.querySelector(`#canvas${sig.pageNumber}`)?.parentNode?.querySelector('.annotationLayer') as HTMLDivElement;
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



const touchDragItem = ref<any>()

const touchstartDrag = (e: any, item: any, arr: any, fromSection: boolean) => {
	// This function is used to create the image element that will be used to display the signature
	// The image is created as a new element and it's attributes are set
	// The image is then appended to the app element

	// Create a new image element
	const image = document.createElement("img");
	// Set its ID to "image-float"
	image.setAttribute("id", "image-float");
	// Set its source to the item's signature
	image.src = item.signature;
	// Set its width to 100px if not on a mobile device, or 50px if on a mobile device
	image.width = isPlatform('capacitor') && fromSection ? 50 : 100;
	// Set its height to 100px if not on a mobile device, or 50px if on a mobile device
	image.height = isPlatform('capacitor') && fromSection ? 50 : 100;
	// Set its position to absolute
	image.style.position = 'absolute';

	// Get the x position of the touch event
	const left = e.touches[0].pageX;
	// Get the y position of the touch event
	const top = e.touches[0].pageY;
	// Set the x position of the image to the x position of the touch event
	image.style.left = left + 'px';
	// Set the y position of the image to the y position of the touch event
	image.style.top = top + 'px';

	// Set the touchDragItem value to the image element
	touchDragItem.value = image
	// Append the image to the document body
	document.getElementById('app')?.appendChild(image);
};

const touchmoveDrag = (e: any) => {

	// on touch move or dragging, we get the newly created image element
	const image = document.getElementById('image-float')
	// this will give us the dragging feeling of the element while actually it's a different element
	const left = e.touches[0].pageX;
	const top = e.touches[0].pageY;
	if(image){
		image.style.position = 'absolute'
		image.style.left = left + 'px';
		image.style.top = top + 'px';
	}

};
const touchendDrag = (e: TouchEvent) => {
	(touchDragItem.value as HTMLImageElement).remove();
	const deleteMobile = document.getElementById('delete-mobile');
	const minXDeleteMobile = deleteMobile?.getBoundingClientRect().left??0;
	const maxXDeleteMobile = deleteMobile?.getBoundingClientRect().right??0;
	const minYDeleteMobile = deleteMobile?.getBoundingClientRect().top??0;
	const maxYDeleteMobile = deleteMobile?.getBoundingClientRect().bottom??0;
	const touchX = e.changedTouches[0].clientX;
	const touchY = e.changedTouches[0].clientY;
	const overlap = !(maxXDeleteMobile < touchX ||
		minXDeleteMobile > touchX ||
		maxYDeleteMobile < touchY ||
		minYDeleteMobile > touchY)
	const mySection = ((e.target as HTMLElement).parentNode as HTMLElement);
	if (overlap && selectedSection.value) {
		selectedSection.value.remove();
		isDragging.value = false;
		const fileSignatureFromSection: FileSignature = getFileSignatureFromSection(mySection)

		store.deleteSignature(fileSignatureFromSection);

		selectedSection.value = undefined;
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
			currentPageAnnotationLayer.value = canvas.parentElement?.querySelector('.annotationLayer') as HTMLDivElement;
			currentPageTextLayer.value = canvas.parentElement?.querySelector('.textLayer') as HTMLDivElement;
			addSignature((touchDragItem.value as HTMLImageElement).src, touchX - canvasRect.left, touchY - canvasRect.top, false, undefined, undefined, undefined, undefined, mySection?.dataset.isHandwritten === 'true', mySection?.dataset.isHandwritten === 'true');
		}
	});


	isDragging.value = false;

}


function getFileSignatureFromSection(mySection: HTMLElement): FileSignature {
	return {
		fileId: parseInt(mySection?.dataset.fileId as string),
		posX: parseFloat(mySection?.dataset.posX as string),
		posY: parseFloat(mySection?.dataset.posY as string),
		width: parseFloat(mySection?.dataset.width as string),
		height: parseFloat(mySection?.dataset.height as string),
		pageNumber: parseInt(mySection?.dataset.pageNumber as string),
		signatureId: parseInt(mySection?.dataset.signatureId as string),
		pageWidth: parseFloat(mySection?.dataset.pageWidth as string),
		isHandwritten: mySection?.dataset.isHandwritten === 'true',
	};
}

function createAndAppendSection(currentFileSignature: FileSignature | undefined, droppedY: number, droppedX: number, right: number, left: number, bottom: number, top: number, data: string) {
	const section = document.createElement('section');
	section.classList.add('signature');
	fillSectionDataset(section, currentFileSignature);
	positionSectionHandWritten(section, droppedY, droppedX, right, left, bottom, top);

	const img = document.createElement('img');
	img.src = data;
	section.appendChild(img);
	currentPageAnnotationLayer.value?.appendChild(section);

	addEventListenersToSection(section, data, currentFileSignature);
}

function addEventListenersToSection(section: HTMLElement, data: string, currentFileSignature: FileSignature | undefined) {
	section.onmouseover = () => {
		section.style.filter = 'drop-shadow(0px 0px 5px #890505)';
		section.style.cursor = 'grab';
	};

	section.onmouseout = () => {
		section.style.filter = 'none';
		section.style.cursor = 'default';
	};




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
		};
		// // console.log('touchstart');
		// // console.log(selectedFileSignature.value);
		touchstartDrag(ev, { signature: data }, [], true);
	};

	section.ontouchmove = (ev) => {
		touchmoveDrag(ev);
	};

	section.ontouchend = (ev) => {
		touchendDrag(ev);
	};

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
	};
}

function positionSectionHandWritten(section: HTMLElement, droppedY: number, droppedX: number, right: number, left: number, bottom: number, top: number) {
	section.style.position = 'absolute';
	section.style.top = `${droppedY}px`;
	section.style.left = `${droppedX}px`;
	section.style.width = `${right - left}px`;
	section.style.height = `${bottom - top}px`;
	section.style.zIndex = '100';
}

function fillSectionDataset(section: HTMLElement, currentFileSignature: FileSignature | undefined) {
	section.dataset.fileId = currentFileSignature?.fileId.toString();
	section.dataset.posX = currentFileSignature?.posX.toString();
	section.dataset.posY = currentFileSignature?.posY.toString();
	section.dataset.width = currentFileSignature?.width.toString();
	section.dataset.height = currentFileSignature?.height.toString();
	section.dataset.pageNumber = currentFileSignature?.pageNumber.toString();
	section.dataset.signatureId = currentFileSignature?.signatureId.toString();
	section.dataset.pageWidth = currentFileSignature?.pageWidth.toString();
	section.dataset.isHandwritten = currentFileSignature?.isHandwritten.toString();

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
