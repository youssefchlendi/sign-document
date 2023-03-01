export interface FileSignature {
	id: string;
	fileId: number;
	signatureId: number;
	posX: number;
	posY: number;
	width: number;
	height: number;
	pageNumber: number;
	canvasWidth: number;
	isHandwritten: boolean;
}