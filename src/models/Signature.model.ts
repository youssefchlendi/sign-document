export class Signature {
	id: number;
	signature: string;
	title: string;
	created_at: string;

	constructor(id:(number|null) = null,signature: string, title: string) {
		this.id = id?id:Date.now() + Math.floor(Math.random() * 1000);
		this.signature = signature;
		this.title = title;
		this.created_at = new Date().toISOString();
	}
}
