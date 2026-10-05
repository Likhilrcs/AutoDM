import pytest
from app.utils.text import normalize, matches

def test_normalization():
    # Strip emoji & punctuation
    assert normalize("LINK please!") == "link please"
    assert normalize("Hey 🔥 LINK 🚀") == "hey link"
    assert normalize("  spaces   collapsed  ") == "spaces collapsed"
    
    # Case sensitive test
    assert normalize("Link", case_sensitive=True) == "Link"
    assert normalize("Link", case_sensitive=False) == "link"

def test_prd_matcher_table_contains_case_insensitive():
    # Table from PRD §23.1: Keyword 'link' (contains, case-insensitive)
    keyword = "link"
    mode = "contains"
    case_sensitive = False

    # Positive matches
    assert matches("LINK", keyword, mode, case_sensitive) is True
    assert matches("link!!", keyword, mode, case_sensitive) is True
    assert matches("Can you send me the LINK?", keyword, mode, case_sensitive) is True
    assert matches("send me the link", keyword, mode, case_sensitive) is True
    assert matches("linked in bio", keyword, mode, case_sensitive) is False # whole-word match prevents matching "linked"

    # Negative matches
    assert matches("hyperlink", keyword, mode, case_sensitive) is False
    assert matches("love this reel!", keyword, mode, case_sensitive) is False

def test_prd_matcher_table_exact():
    # Table from PRD §23.1: Keyword 'LINK' (exact)
    keyword = "LINK"
    mode = "exact"
    case_sensitive = False

    assert matches("LINK", keyword, mode, case_sensitive) is True
    assert matches("link!!", keyword, mode, case_sensitive) is True # punctuation stripped
    assert matches("Can you send me the LINK?", keyword, mode, case_sensitive) is False
    assert matches("send me the link", keyword, mode, case_sensitive) is False
    assert matches("hyperlink", keyword, mode, case_sensitive) is False

def test_case_sensitivity():
    keyword = "LINK"
    mode = "contains"
    
    # Case sensitive match
    assert matches("Please send LINK now", keyword, mode, case_sensitive=True) is True
    assert matches("Please send link now", keyword, mode, case_sensitive=True) is False

def test_empty_keyword():
    assert matches("hello world", "", "contains") is False
    assert matches("", "link", "contains") is False
