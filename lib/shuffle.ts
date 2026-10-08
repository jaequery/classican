/**
 * A shuffled deck of piece indices, dealt one at a time: every piece comes up
 * once before any piece comes up again. When the deck runs out it is
 * reshuffled, and the piece just played is never dealt first.
 */
export type Deck = {
  draw: (current: number) => number;
  /** The piece `draw(current)` will deal next, without dealing it. */
  peek: (current: number) => number;
  putBack: (index: number) => void;
};

function shuffled(indices: number[]) {
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/** A deck of `n` pieces with `first` already dealt. */
export function createDeck(n: number, first: number): Deck {
  const all = () => Array.from({ length: n }, (_, i) => i);
  let queue = shuffled(all().filter((i) => i !== first));
  // Reshuffling here, and keeping the result, means a peek always matches the next draw.
  const peek = (current: number) => {
    if (n < 2) return 0;
    if (queue.length === 0) {
      queue = shuffled(all());
      if (queue[0] === current) [queue[0], queue[n - 1]] = [queue[n - 1], queue[0]];
    }
    return queue[0];
  };
  return {
    draw(current) {
      const next = peek(current);
      if (n >= 2) queue.shift();
      return next;
    },
    peek,
    /** Return a piece to the top of the deck, so it is dealt next. */
    putBack(index) {
      queue.unshift(index);
    },
  };
}
