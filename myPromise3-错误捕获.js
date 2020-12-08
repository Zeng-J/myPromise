class MyPromise {
    static PENDING = 'pending'
    static FULFILLED = 'fulfilled'
    static REJECTED = 'rejected'

    constructor(executor) {
        this.state = MyPromise.PENDING
        this.result = undefined
        this.callbacks = []

        try {
            executor(this.resolve.bind(this), this.reject.bind(this))
        } catch(e) {
            this.result = e
            this.state = MyPromise.REJECTED
        }
    }

    assign(value, state) {
      	// 若状态已经改变，不可再更改
      	if (this.state !== MyPromise.PENDING) {
            return
        }
        this.state = state
        this.result = value
        for (let callback of this.callbacks) {
            if (state === MyPromise.FULFILLED) {
                callback.onFulfilled(this.result)
            } else {
                callback.onRejected(this.result)
            }
        }
        this.callbacks = []
    }

    resolve(value) {
        this.assign(value, MyPromise.FULFILLED)
    }
    reject(value) {
        this.assign(value, MyPromise.REJECTED)
    }

    then(onFulfilled, onRejected) {
        if (this.state === MyPromise.PENDING) {
            this.callbacks.push({
                onFulfilled,
                onRejected
            })
        }
        if (this.state === MyPromise.FULFILLED) {
            setTimeout(() => onFulfilled(this.result))
        }
        if (this.state === MyPromise.REJECTED) {
            setTimeout(() => onRejected(this.result)) 
        }
    }
}