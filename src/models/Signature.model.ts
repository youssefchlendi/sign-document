export class Signature {
	id: number;
	signature: string;
	title: string;
	created_at: string;
	hand_written: boolean;

	constructor(id:(number|null) = null,signature: string, title: string,hand_written = false) {
		this.id = id?id:Date.now() + Math.floor(Math.random() * 1000);
		this.signature = signature;
		this.title = title;
		this.created_at = new Date().toISOString();
		this.hand_written = hand_written;
	}
}
