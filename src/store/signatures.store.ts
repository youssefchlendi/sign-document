import { Signature } from '@/models/Signature.model';
import { defineStore } from 'pinia'; 
import { ref } from 'vue';

export const useSignaturesStore = defineStore("signature-store",() => {
	const signatures = ref<Signature[]>([]);

	async function addSignature(signature: string, title: string) {
		signatures.value.push(new Signature(signature, title));
	}

	async function removeSignature(id: number) {
		if (!signatures.value.length) return;
		if (signatures.value.findIndex((signature) => signature.id === id) === -1) return;

		signatures.value = signatures.value.filter((signature) => signature.id !== id);
	}

	async function clearSignatures() {
		signatures.value = [];
	}


	return {
		signatures,
		addSignature,
		removeSignature,
		clearSignatures
	}
});