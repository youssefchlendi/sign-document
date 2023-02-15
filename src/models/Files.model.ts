export class File {
  public id: number;
  public name: string;
  public file: string;
  public created_at: Date;

  constructor(name: string, file: string) {
	this.id = Date.now();
	this.name = name;
	this.file = file;
	this.created_at = new Date();
  }
}