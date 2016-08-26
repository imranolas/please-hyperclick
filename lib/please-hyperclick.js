'use babel';
import {CompositeDisposable} from 'atom';
import suggestions from './suggestions.js';

export default {
  config: {
    extensions: {
      description: "Comma separated list of extensions to check for when a file isn't found",
      type: 'array',
      default: ['BUILD'],
      items: {type: 'string'},
    }
  },
  activate() {
    this.subscriptions = new CompositeDisposable();
  },
  getProvider() {
    return suggestions;
  },
  deactivate() {
    this.subscriptions.dispose();
  }
};
