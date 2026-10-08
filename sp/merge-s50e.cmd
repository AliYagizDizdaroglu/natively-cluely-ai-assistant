@echo off
rem Merge every grader's verdicts into the s50e run's judge files, which also regenerates the
rem pass record. Run with the repo root as the working directory.
set RUN=electron\test\golden\interview60.runs\2026-09-14T08-22-28-s50e
set S=%~dp0
set J="C:\Program Files\nodejs\node.exe" electron\test\golden\interview60.judge.mjs %RUN%
%J% --verdicts "%S%s50e-verdicts-inapp-merged.json"
%J% --answers %RUN%\interview60.answers.json --verdicts "%S%s50e-verdicts-arm31lite-m3.json"
%J% --answers %RUN%\interview60.answers.gemini-3.5-flash-lite.json --verdicts "%S%s50e-verdicts-arm35lite-m4.json"
%J% --answers %RUN%\interview60.answers.qwen_qwen3.8-27b.json --verdicts "%S%s50e-verdicts-qwen-m5.json"
%J% --answers %RUN%\interview60.answers.openai_gpt-oss-120b.json --verdicts "%S%s50e-verdicts-gptoss-m6.json"
%J% --answers %RUN%\interview60.answers.gemini-3.8-flash.json --verdicts "%S%s50e-verdicts-flash38-m7.json"
%J% --answers %RUN%\interview60.answers.gemini-3.7-flash.json --verdicts "%S%s50e-verdicts-flash37-m8.json"
%J% --answers %RUN%\interview60.answers.gemini-3.6-flash.json --verdicts "%S%s50e-verdicts-flash36-m9.json"
%J% --answers %RUN%\interview60.answers.gemini-3.5-flash.json --verdicts "%S%s50e-verdicts-flash35-m10.json"
