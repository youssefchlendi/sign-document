export const cropBase64Image = (base64String: string): Promise<{ img: string, left: number, top: number, right: number, bottom: number }> => {
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
			console.log('width', canvas.width, 'height', canvas.height);
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