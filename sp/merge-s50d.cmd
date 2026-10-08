@echo off
rem Merge every grader's verdicts into the s50d run's judge files, which also regenerates the
rem pass record. Run with the repo root as the working directory.
set RUN=electron\test\golden\interview60.runs\2026-09-13T08-22-36-s50d
set S=%~dp0
set J="C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.judge.mjs %RUN%
%J% --verdicts "%S%s50d-verdicts-inapp-merged.json"
%J% --answers %RUN%\interview60.answers.json --verdicts "%S%s50d-verdicts-arm31lite-c3.json"
%J% --answers %RUN%\interview60.answers.gemini-3.5-flash-lite.json --verdicts "%S%s50d-verdicts-arm35lite-d4.json"
%J% --answers %RUN%\interview60.answers.gemini-3.8-flash.json --verdicts "%S%s50d-verdicts-flash38-e5.json"
%J% --answers %RUN%\interview60.answers.gemini-3.7-flash.json --verdicts "%S%s50d-verdicts-flash37-e6.json"
%J% --answers %RUN%\interview60.answers.gemini-3.6-flash.json --verdicts "%S%s50d-verdicts-flash36-e7.json"
%J% --answers %RUN%\interview60.answers.gemini-3.5-flash.json --verdicts "%S%s50d-verdicts-flash35-e8.json"
