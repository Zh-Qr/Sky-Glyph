export const ROMANTIC_STAR_PHRASES = [
  '今晚的天空，把你的名字藏进了光里。',
  '星星没有说话，只把答案连成了形状。',
  '这不是想象的星座，是此刻真实的天穹写下的信。',
  '宇宙很远，但这一笔刚好落在你眼前。',
  '每一颗被点亮的星，都曾真实地抵达这片夜空。',
  '让科学计算坐标，让浪漫决定如何相遇。',
  '天上的光走了很多年，今晚刚好组成一个字。',
  '不是我们画出了星星，是星星允许我们读懂它们。',
  '愿这片夜色，把某个瞬间保存得比语言更久。',
  '在可测量的宇宙里，留下一个不可替代的温柔。',
  '坐标属于天空，意义属于看见它的人。',
  '群星散落无声，直到被你选中的字符召集。',
  '此刻的地球、此刻的时间、此刻的你，共同签下这封星信。',
  '真实的星光很冷，但被连成字时有了体温。',
  '把一个字符交给夜空，它回赠一小片宇宙。',
]

export function pickRomanticPhrase(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return ROMANTIC_STAR_PHRASES[hash % ROMANTIC_STAR_PHRASES.length]
}
