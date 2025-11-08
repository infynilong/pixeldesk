import { getCharacterImageUrl } from '@/lib/characterUtils'

console.log('Testing getCharacterImageUrl():\n')

// Test 1: Character key without extension
const test1 = getCharacterImageUrl('hangli')
console.log(`✓ Character key 'hangli' → ${test1}`)
console.assert(test1 === '/assets/characters/hangli.png', 'Should add .png extension')

// Test 2: Character key with extension
const test2 = getCharacterImageUrl('Premade_Character_48x48_02.png')
console.log(`✓ Character key with ext 'Premade_Character_48x48_02.png' → ${test2}`)
console.assert(test2 === '/assets/characters/Premade_Character_48x48_02.png', 'Should keep extension')

// Test 3: Custom avatar path (absolute)
const test3 = getCharacterImageUrl('/avatars/cmfmfwq540005c9ddaus2koau_1758272429429.jpeg')
console.log(`✓ Custom avatar '/avatars/xxx.jpeg' → ${test3}`)
console.assert(test3 === '/avatars/cmfmfwq540005c9ddaus2koau_1758272429429.jpeg', 'Should preserve path')

// Test 4: HTTP URL
const test4 = getCharacterImageUrl('https://example.com/avatar.png')
console.log(`✓ HTTP URL 'https://example.com/avatar.png' → ${test4}`)
console.assert(test4 === 'https://example.com/avatar.png', 'Should preserve URL')

// Test 5: Null/undefined
const test5 = getCharacterImageUrl(null)
const test6 = getCharacterImageUrl(undefined)
console.log(`✓ null → ${test5}`)
console.log(`✓ undefined → ${test6}`)
console.assert(test5 === null, 'Should return null')
console.assert(test6 === null, 'Should return null')

console.log('\n✅ All tests passed!')
