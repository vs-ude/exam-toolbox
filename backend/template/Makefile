VIEWER = `which atril evince`
PW ?= 'LuSlRDTLeK1zzUHF'

all: exam.pdf

encrypted: exam.pdf
	qpdf --encrypt $(PW) $(PW) 256 -- \
		exam.pdf \
		exam_encrypted.pdf

exam.pdf: *.tex
	pdflatex -halt-on-error exam.tex
	pdflatex -halt-on-error exam.tex
	pdflatex -halt-on-error exam.tex

clean:
	rm -f *.dvi *.log *.aux svg/*.pdf *.bbl *.blg *.out *.synctex.gz *.fls *.pdf *.fdb_latexmk

view: exam.pdf
	$(VIEWER) exam.pdf

svn-ignore:
	svn propset svn:ignore -RF .gitignore .

