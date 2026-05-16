# from resume_parser import resumeparse

_parser = None
print("This is called")

def get_parser():
    print("Get parser is called")
    global _parser
    if _parser is None:
        from resume_parser import resumeparse
        _parser = resumeparse
    return _parser