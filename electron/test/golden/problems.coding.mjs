/**
 * GOLDEN CODING SET — 5 medium LeetCode problems, 5-6 screenshots each.
 *
 * Design rules every problem here follows:
 *
 * 1. SPLIT SO SHOT 1 IS NOT ENOUGH. The required entry name appears ONLY on the
 *    last screenshot and the assertions exercise behaviour stated only on the
 *    middle ones. A model that reads the first image alone cannot pass, so
 *    "executable" doubles as proof that every screenshot was received.
 *
 * 2. EVERY PROBLEM HAS A REFERENCE AND A NEGATIVE. The reference must pass its
 *    own assertions; the negative — a *correct algorithm* that only saw shot 1,
 *    or that ignores a rule stated mid-deck — must fail them. calibrate.mjs
 *    enforces both before any model result is believed.
 *
 * 3. THE SET TESTS BOTH DIRECTIONS OF THE STDLIB CONTRACT.
 *    INTERVIEW_COPILOT_PROMPT REQUIRES the sentence
 *      "Python has <tool> for this, but let me implement the mechanism directly."
 *    when the stdlib tool IS the thing being built, and FORBIDS it when the tool
 *    is merely useful for solving — it names "a Counter to find the k most
 *    frequent items" and "a dict to group anagrams" as non-firing cases.
 *    So PY1-PY3 expect the template, PY4-PY5 expect its ABSENCE. A set of only
 *    should-fire problems would score full marks on a prompt that fires always.
 */

export const CODING = [
  // ══ PY1 — LRU Cache (LC146) -> OrderedDict.  Template SHOULD fire. ═══════
  // Also the regression case for the RECITATION empty-stream bug (2026-08-25):
  // the pythonic follow-up here is what Gemini's recitation filter blocks.
  {
    id: 'PY1', name: 'LRU Cache', leetcode: 146, difficulty: 'Medium',
    tool: 'collections.OrderedDict', toolRe: /OrderedDict/, templateExpected: true,
    entry: 'LRUCache',
    shots: [
      { title: '146. LRU Cache   [Medium]', lines: [
        'Design a data structure that follows the constraints of a',
        'Least Recently Used (LRU) cache.',
        '',
        'The cache is initialised with a positive capacity. Reading a key',
        'and writing a key both count as USING that key.',
        '', 'Scroll for behaviour, examples and the required API.' ] },
      { title: '146. LRU Cache — Behaviour', lines: [
        'get(key)   -> return the value if present, otherwise -1.',
        'put(key,v) -> insert or overwrite the value.',
        '',
        'When a put would exceed capacity, evict the key that has gone',
        'the LONGEST without being used.',
        '',
        'Overwriting an existing key counts as using it, and must NOT',
        'evict anything.' ] },
      { title: '146. LRU Cache — Example 1', mono: true, lines: [
        'cache = <ClassName>(2)',
        'cache.put(1, 1)', 'cache.put(2, 2)',
        'cache.get(1)     -> 1',
        'cache.put(3, 3)  # evicts key 2',
        'cache.get(2)     -> -1',
        'cache.put(4, 4)  # evicts key 1',
        'cache.get(1)     -> -1',
        'cache.get(3)     -> 3', 'cache.get(4)     -> 4' ] },
      { title: '146. LRU Cache — Constraints', lines: [
        '1 <= capacity <= 3000', '0 <= key <= 10^4', '0 <= value <= 10^5',
        'At most 2 * 10^5 calls will be made to get and put.' ] },
      { title: '146. LRU Cache — Follow-up', lines: [
        '**Both get and put must run in O(1) average time complexity.',
        '',
        'A solution that scans the cache to find the least recently used',
        'key on every eviction will not be accepted.' ] },
      { title: '146. LRU Cache — Required API', mono: true, lines: [
        'Implement EXACTLY this class. Do not rename it.', '',
        'class LRUCache:',
        '    def __init__(self, capacity: int): ...',
        '    def get(self, key: int) -> int: ...',
        '    def put(self, key: int, value: int) -> None: ...' ] },
    ],
    tests: `
c = LRUCache(2)
c.put(1,1); c.put(2,2)
assert c.get(1) == 1
c.put(3,3); assert c.get(2) == -1
c.put(4,4); assert c.get(1) == -1
assert c.get(3) == 3 and c.get(4) == 4
o = LRUCache(2)
o.put(1,1); o.put(2,2); o.put(1,99)
assert o.get(1) == 99
o.put(3,3)
assert o.get(2) == -1 and o.get(1) == 99
s = LRUCache(1)
s.put(5,5); s.put(6,6)
assert s.get(5) == -1 and s.get(6) == 6
`,
    reference: `
from collections import OrderedDict
class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity; self.d = OrderedDict()
    def get(self, key: int) -> int:
        if key not in self.d: return -1
        self.d.move_to_end(key); return self.d[key]
    def put(self, key: int, value: int) -> None:
        if key in self.d: self.d.move_to_end(key)
        self.d[key] = value
        if len(self.d) > self.cap: self.d.popitem(last=False)
`,
    // Correct-ish algorithm, but named from shot 1 only.
    negative: `
class Cache:
    def __init__(self, capacity): self.cap=capacity; self.d={}
    def get(self, k): return self.d.get(k, -1)
    def put(self, k, v): self.d[k]=v
`,
  },

  // ══ PY2 — Circular Queue / ring buffer (LC622) -> deque. SHOULD fire. ════
  {
    id: 'PY2', name: 'Design Circular Queue', leetcode: 622, difficulty: 'Medium',
    tool: 'collections.deque', toolRe: /deque/, templateExpected: true,
    entry: 'RingBuffer',
    shots: [
      { title: '622. Design Circular Queue   [Medium]', lines: [
        'Design a fixed-size ring buffer: a queue laid out in a circle so',
        'that space in front of the head is reused once elements are',
        'dequeued.', '',
        'It must support pushing and popping from BOTH ends in O(1).',
        '', 'Scroll for operations, examples and the required API.' ] },
      { title: '622. Circular Queue — Operations', lines: [
        'push_back(v)  -> append at the tail. True, or False if full.',
        'push_front(v) -> insert at the head. True, or False if full.',
        'pop_back()    -> remove and return the tail value, or -1 if empty.',
        'pop_front()   -> remove and return the head value, or -1 if empty.',
        'is_full()     -> True when the buffer holds `capacity` items.' ] },
      { title: '622. Circular Queue — Example 1', mono: true, lines: [
        'rb = <ClassName>(3)',
        'rb.push_back(1)   -> True', 'rb.push_back(2)   -> True',
        'rb.push_front(0)  -> True', 'rb.is_full()      -> True',
        'rb.push_back(9)   -> False   # full, rejected',
        'rb.pop_front()    -> 0', 'rb.pop_back()     -> 2',
        'rb.pop_front()    -> 1', 'rb.pop_back()     -> -1      # empty' ] },
      { title: '622. Circular Queue — Constraints', lines: [
        '1 <= capacity <= 1000', '0 <= value <= 1000',
        'At most 3000 calls will be made to the operations.', '',
        'A rejected push must NOT change the contents of the buffer.' ] },
      { title: '622. Circular Queue — Follow-up', lines: [
        '**Every operation must be O(1).', '',
        'Do not implement push_front by shifting every element right;',
        'that is O(n) and will time out on the largest test.' ] },
      { title: '622. Circular Queue — Required API', mono: true, lines: [
        'Implement EXACTLY this class. Do not rename it.', '',
        'class RingBuffer:',
        '    def __init__(self, capacity: int): ...',
        '    def push_back(self, value: int) -> bool: ...',
        '    def push_front(self, value: int) -> bool: ...',
        '    def pop_back(self) -> int: ...',
        '    def pop_front(self) -> int: ...',
        '    def is_full(self) -> bool: ...' ] },
    ],
    tests: `
rb = RingBuffer(3)
assert rb.push_back(1) is True and rb.push_back(2) is True
assert rb.push_front(0) is True and rb.is_full() is True
assert rb.push_back(9) is False
assert rb.pop_front() == 0 and rb.pop_back() == 2 and rb.pop_front() == 1
assert rb.pop_back() == -1
e = RingBuffer(1)
assert e.pop_front() == -1
assert e.push_front(7) is True and e.is_full() is True
assert e.push_front(8) is False
assert e.pop_back() == 7
`,
    reference: `
from collections import deque
class RingBuffer:
    def __init__(self, capacity: int):
        self.cap = capacity; self.q = deque()
    def push_back(self, value: int) -> bool:
        if len(self.q) >= self.cap: return False
        self.q.append(value); return True
    def push_front(self, value: int) -> bool:
        if len(self.q) >= self.cap: return False
        self.q.appendleft(value); return True
    def pop_back(self) -> int:
        return self.q.pop() if self.q else -1
    def pop_front(self) -> int:
        return self.q.popleft() if self.q else -1
    def is_full(self) -> bool:
        return len(self.q) >= self.cap
`,
    negative: `
class CircularQueue:
    def __init__(self, capacity): self.cap=capacity; self.a=[]
    def enQueue(self, v): self.a.append(v); return True
    def deQueue(self): return self.a.pop(0) if self.a else -1
`,
  },

  // ══ PY3 — Kth Largest in a Stream (LC703) -> heapq. SHOULD fire. ═════════
  {
    id: 'PY3', name: 'Kth Largest Element in a Stream', leetcode: 703, difficulty: 'Medium',
    tool: 'heapq', toolRe: /heapq|heappush|heapify/, templateExpected: true,
    entry: 'KthLargest',
    shots: [
      { title: '703. Kth Largest in a Stream   [Medium]', lines: [
        'Design a class that maintains a MIN-HEAP based priority queue in',
        'order to report the kth largest element seen so far in a stream.',
        '',
        'The class is constructed with k and an initial list of numbers,',
        'then values arrive one at a time.',
        '', 'Scroll for behaviour, examples and the required API.' ] },
      { title: '703. Kth Largest — Behaviour', lines: [
        'add(value) -> insert the value into the stream, then return the',
        '              kth largest element seen so far.', '',
        'This is the kth largest in sorted ORDER, not the kth DISTINCT',
        'element — duplicates count separately.', '',
        'It is guaranteed there are at least k elements when add is called.' ] },
      { title: '703. Kth Largest — Example 1', mono: true, lines: [
        'kl = <ClassName>(3, [4, 5, 8, 2])',
        'kl.add(3)   -> 4', 'kl.add(5)   -> 5', 'kl.add(10)  -> 5',
        'kl.add(9)   -> 8', 'kl.add(4)   -> 8' ] },
      { title: '703. Kth Largest — Constraints', lines: [
        '1 <= k <= 10^4', '0 <= len(nums) <= 10^4',
        '-10^4 <= nums[i] <= 10^4',
        'At most 10^4 calls will be made to add.' ] },
      { title: '703. Kth Largest — Follow-up', lines: [
        '**add must run in O(log k), not O(n log n).', '',
        'Re-sorting the whole stream on every add will time out.',
        'Keep only the k largest values in the priority queue.' ] },
      { title: '703. Kth Largest — Required API', mono: true, lines: [
        'Implement EXACTLY this class. Do not rename it.', '',
        'class KthLargest:',
        '    def __init__(self, k: int, nums: list[int]): ...',
        '    def add(self, value: int) -> int: ...' ] },
    ],
    tests: `
kl = KthLargest(3, [4,5,8,2])
assert kl.add(3) == 4 and kl.add(5) == 5 and kl.add(10) == 5
assert kl.add(9) == 8 and kl.add(4) == 8
d = KthLargest(2, [0])
assert d.add(-1) == -1 and d.add(1) == 0 and d.add(-2) == 0
assert d.add(-4) == 0 and d.add(3) == 1
dup = KthLargest(2, [5,5,5])
assert dup.add(5) == 5
`,
    reference: `
import heapq
class KthLargest:
    def __init__(self, k: int, nums: list[int]):
        self.k = k; self.h = list(nums); heapq.heapify(self.h)
        while len(self.h) > k: heapq.heappop(self.h)
    def add(self, value: int) -> int:
        heapq.heappush(self.h, value)
        if len(self.h) > self.k: heapq.heappop(self.h)
        return self.h[0]
`,
    negative: `
class KthLargestStream:
    def __init__(self, k, nums): self.k=k; self.a=list(nums)
    def add(self, v):
        self.a.append(v); self.a.sort(reverse=True); return self.a[self.k-1]
`,
  },

  // ══ PY4 — Top K Frequent (LC347) -> Counter. Template must NOT fire. ═════
  // The prompt names this exact case as non-firing: Counter is USEFUL here,
  // it is not the thing being built. Guards the over-fire regression.
  {
    id: 'PY4', name: 'Top K Frequent Elements', leetcode: 347, difficulty: 'Medium',
    tool: 'collections.Counter', toolRe: /Counter|most_common|nlargest/, templateExpected: false,
    entry: 'top_k_frequent',
    shots: [
      { title: '347. Top K Frequent Elements   [Medium]', lines: [
        'Given an integer array and an integer k, return the k most',
        'frequent elements.', '',
        'The answer may be returned in any order.', '',
        'Scroll for examples, constraints and the required signature.' ] },
      { title: '347. Top K Frequent — Examples', mono: true, lines: [
        'nums = [1,1,1,2,2,3], k = 2   ->  [1,2]',
        'nums = [1], k = 1             ->  [1]',
        'nums = [4,4,4,5,5,6], k = 2   ->  [4,5]', '',
        'It is guaranteed the answer is unique — no ties at the cut-off.' ] },
      { title: '347. Top K Frequent — Constraints', lines: [
        '1 <= len(nums) <= 10^5', '-10^4 <= nums[i] <= 10^4',
        'k is in the range [1, number of distinct elements]', '',
        'The answer is guaranteed to be unique.' ] },
      { title: '347. Top K Frequent — Follow-up', lines: [
        '**Your algorithm must be better than O(n log n).', '',
        'Sorting every distinct value by frequency is the obvious',
        'approach but does not meet the bound for large inputs.' ] },
      { title: '347. Top K Frequent — Required Signature', mono: true, lines: [
        'Implement EXACTLY this function. Do not rename it.', '',
        'def top_k_frequent(nums: list[int], k: int) -> list[int]:',
        '    ...', '',
        'Return a list of the k values (order does not matter).' ] },
    ],
    tests: `
assert sorted(top_k_frequent([1,1,1,2,2,3], 2)) == [1,2]
assert top_k_frequent([1], 1) == [1]
assert sorted(top_k_frequent([4,4,4,5,5,6], 2)) == [4,5]
assert sorted(top_k_frequent([3,3,3,1,1,2], 3)) == [1,2,3]
assert sorted(top_k_frequent([-1,-1,2], 1)) == [-1]
`,
    reference: `
from collections import Counter
def top_k_frequent(nums: list[int], k: int) -> list[int]:
    return [v for v, _ in Counter(nums).most_common(k)]
`,
    negative: `
def topKFrequent(nums, k):     # wrong name — shot 5 not read
    from collections import Counter
    return [v for v, _ in Counter(nums).most_common(k)]
`,
  },

  // ══ PY5 — Group Anagrams (LC49) -> defaultdict. Must NOT fire. ═══════════
  {
    id: 'PY5', name: 'Group Anagrams', leetcode: 49, difficulty: 'Medium',
    tool: 'collections.defaultdict', toolRe: /defaultdict|setdefault|groupby/, templateExpected: false,
    entry: 'group_anagrams',
    shots: [
      { title: '49. Group Anagrams   [Medium]', lines: [
        'Given an array of strings, group the anagrams together.', '',
        'Two strings are anagrams when one can be formed by rearranging',
        'the letters of the other, using all the original letters',
        'exactly once.', '',
        'Scroll for examples, constraints and the required signature.' ] },
      { title: '49. Group Anagrams — Examples', mono: true, lines: [
        'strs = ["eat","tea","tan","ate","nat","bat"]',
        '  ->  [["eat","tea","ate"], ["tan","nat"], ["bat"]]', '',
        'strs = [""]      ->  [[""]]',
        'strs = ["a"]     ->  [["a"]]', '',
        'Groups and the strings inside them may be in any order.' ] },
      { title: '49. Group Anagrams — Constraints', lines: [
        '1 <= len(strs) <= 10^4', '0 <= len(strs[i]) <= 100',
        'strs[i] consists of lowercase English letters only.', '',
        'An empty string is a valid input and forms its own group.' ] },
      { title: '49. Group Anagrams — Follow-up', lines: [
        '**Aim for O(n * k log k) where k is the longest string length.', '',
        'Comparing every pair of strings is O(n^2 * k) and will time',
        'out on the largest inputs.' ] },
      { title: '49. Group Anagrams — Required Signature', mono: true, lines: [
        'Implement EXACTLY this function. Do not rename it.', '',
        'def group_anagrams(strs: list[str]) -> list[list[str]]:',
        '    ...', '',
        'Order of the groups, and within a group, does not matter.' ] },
    ],
    tests: `
def norm(gs): return sorted(sorted(g) for g in gs)
assert norm(group_anagrams(["eat","tea","tan","ate","nat","bat"])) == norm([["eat","tea","ate"],["tan","nat"],["bat"]])
assert norm(group_anagrams([""])) == [[""]]
assert norm(group_anagrams(["a"])) == [["a"]]
assert norm(group_anagrams(["ab","ba","abc","cba","x"])) == norm([["ab","ba"],["abc","cba"],["x"]])
`,
    reference: `
from collections import defaultdict
def group_anagrams(strs: list[str]) -> list[list[str]]:
    g = defaultdict(list)
    for s in strs: g[tuple(sorted(s))].append(s)
    return list(g.values())
`,
    negative: `
def groupAnagrams(strs):      # wrong name — shot 5 not read
    from collections import defaultdict
    g = defaultdict(list)
    for s in strs: g[tuple(sorted(s))].append(s)
    return list(g.values())
`,
  },
];
