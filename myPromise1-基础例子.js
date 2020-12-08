class MyPromise {
    static PENDING = 'pending'
    static FULFILLED = 'fulfilled'
    static REJECTED = 'rejected'

    constructor(executor) {
        this.state = MyPromise.PENDING
        this.result = undefined

        executor(this.resolve.bind(this), this.reject.bind(this))
    }

    resolve(value) {
        this.state = MyPromise.FULFILLED
        this.result = value
    }
    reject(value) {
        this.state = MyPromise.REJECTED
        this.result = value
    }

    then(onFulfilled, onRejected) {
        if (this.state === MyPromise.FULFILLED) {
            setTimeout(() => onFulfilled(this.result))
        }
        if (this.state === MyPromise.REJECTED) {
            setTimeout(() => onRejected(this.result)) 
        }
    }
}