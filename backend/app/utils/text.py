import re
import unicodedata

def normalize(text: str, case_sensitive: bool = False) -> str:
    """
    Normalize text using Unicode NFKC, strip punctuation & emoji, collapse whitespace.
    If not case_sensitive, perform full Unicode casefold.
    """
    if not text:
        return ""
    t = unicodedata.normalize("NFKC", text)
    # Strip punctuation and emoji, replacing with a single space
    t = re.sub(r"[^\w\s]", " ", t, flags=re.UNICODE)
    # Collapse multiple whitespace
    t = re.sub(r"\s+", " ", t).strip()
    return t if case_sensitive else t.casefold()

def matches(comment: str, keyword: str, mode: str = "contains", case_sensitive: bool = False) -> bool:
    """
    Compare comment against trigger keyword.
    mode: 'exact' requires full normalized equality.
    mode: 'contains' requires whole-word boundary match inside sentence.
    """
    c = normalize(comment, case_sensitive)
    k = normalize(keyword, case_sensitive)

    if not k:
        return False

    if mode == "exact":
        return c == k

    # 'contains' whole-word match inside sentence
    pattern = rf"(?<!\w){re.escape(k)}(?!\w)"
    return re.search(pattern, c) is not None
