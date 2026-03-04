export class RateLimiter {
  private maxBurst = 60
  private refillRate = 1000
  private tokens = this.maxBurst
  private lastRefill = Date.now()
  private queue: Array<() => void> = []

  async acquire(): Promise<void> {
    this.refill()
    
    if (this.tokens > 0) {
      this.tokens--
      return
    }

    return new Promise<void>(resolve => {
      this.queue.push(resolve)
      this.scheduleNext()
    })
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    
    if (elapsed >= this.refillRate) {
      const tokensToAdd = Math.floor(elapsed / this.refillRate)
      this.tokens = Math.min(this.maxBurst, this.tokens + tokensToAdd)
      this.lastRefill = now
      this.processQueue()
    }
  }

  private processQueue(): void {
    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens--
      const next = this.queue.shift()!
      next()
    }
  }

  private scheduleNext(): void {
    if (this.queue.length > 0 && this.tokens > 0) {
      this.processQueue()
    } else if (this.queue.length > 0) {
      const timeUntilNextToken = this.refillRate - (Date.now() - this.lastRefill)
      if (timeUntilNextToken > 0) {
        setTimeout(() => this.refill(), timeUntilNextToken)
      }
    }
  }
}