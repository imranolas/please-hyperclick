"use babel"
import { CompositeDisposable } from 'atom'
// import makeCache from './make-cache'
import suggestions from './suggestions.js'

module.exports = {
    config: {
        extensions: {
            description: "Comma separated list of extensions to check for when a file isn't found",
            type: 'array',
            default: [ 'BUILD' ],
            items: { type: 'string' },
        }
    },
    activate(state) {
        this.subscriptions = new CompositeDisposable()
    },
    getProvider() {
        return suggestions
    },
    deactivate() {
        this.subscriptions.dispose()
    }
}
