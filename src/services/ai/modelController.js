export class ModelController {
  constructor() {
    this.activeModel = 'gpt-4o';
    this.context = [];
  }

  setNewModel(modelName) {
    this.activeModel = modelName;
    console.log(`Model switched to: ${this.activeModel}`);
  }

  addContext(input) {
    this.context.push(input);
    if (this.context.length > 10) this.context.shift();
  }

  async processRequest(prompt) {
    console.log(`Processing with ${this.activeModel}: ${prompt}`);
    // Integration logic for specific model API goes here
    return `Response from ${this.activeModel}`;
  }
}