"""Independently validate lesson moves and every rendered board with python-shogi.
Install: python3 -m pip install -r scripts/requirements-test.txt
Run: python3 scripts/validate-moves.py
"""
import json
import subprocess
from pathlib import Path
import shogi

root = Path(__file__).resolve().parents[1]
script = """
import {lessons} from './site/js/lessons.js';
import {replay} from './site/js/shogi.js';
console.log(JSON.stringify(lessons.map(l=>({id:l.id,moves:l.moves.map(m=>m.usi),states:replay(l.moves).states}))));
"""
data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], cwd=root))
plies = 0
for lesson in data:
    board = shogi.Board()
    for index, state in enumerate(lesson['states']):
        if index:
            usi = lesson['moves'][index - 1]
            move = shogi.Move.from_usi(usi)
            assert board.is_legal(move), f"{lesson['id']}: illegal move {index}: {usi}"
            board.push(move)
            plies += 1
        actual = {}
        for square in shogi.SQUARES:
            piece = board.piece_at(square)
            if piece:
                actual[shogi.SQUARE_NAMES[square]] = {'type': piece.symbol().upper(), 'side': piece.color}
        assert actual == state['board'], f"{lesson['id']}: board mismatch at {index}"
        for side in (0, 1):
            expected = {shogi.PIECE_SYMBOLS[p].upper(): n for p, n in board.pieces_in_hand[side].items() if n}
            rendered = {p: n for p, n in state['hands'][side].items() if n}
            assert expected == rendered, f"{lesson['id']}: hand mismatch at {index}"
        assert board.turn == state['turn']
    print(f"PASS {lesson['id']}: {len(lesson['moves'])} legal plies, all boards and hands match")
print(f"Validated {plies} moves across {len(data)} lessons")
