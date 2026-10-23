/** All writes, including startup reconciliation, read fresh state inside one lock. */
export function createRepository({ read, write, withLock }) {
  let tail = Promise.resolve();
  return function update(change) {
    const task = () =>
      withLock(async () => {
        const next = await change(read());
        write(next);
        return next;
      });
    const result = tail.then(task);
    tail = result.catch(() => {});
    return result;
  };
}
