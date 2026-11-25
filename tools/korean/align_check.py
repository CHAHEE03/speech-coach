"""Self-check of score.py's word-in-sentence alignment: python -I tools/korean/align_check.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from score import align, letters
P, S = "다음 단어는 ", " 입니다"
def word_errors(word, heard):
    ref, st = letters(P + word + S), len(letters(P))
    return align(ref, letters(heard), (st, st + len(letters(word))))
assert word_errors("말", "다음 단어는 말 입니다")[0] == 0
assert word_errors("말", "다음 단어는 마르 입니다")[0] == 2
assert word_errors("달", "다음 단어는 탈 입니다") == (1, [("ㄷ", "ㅌ")])
assert word_errors("달", "다음 단어 탈 입니다")[0] == 1  # a carrier error isn't the word's
assert word_errors("밥", "다음 단어는 밥")[0] == 0  # a lost suffix isn't either
assert align(letters("말"), letters("마르"))[0] == 2  # no span: the whole word, as before
print("ok")