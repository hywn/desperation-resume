#!/usr/bin/env -S deno run --allow-read --allow-write

Array.prototype.last = function() {
	return this[this.length-1]
}

Array.prototype.partition = function(f) {
	const a = []
	const b = []
	for (const x of this)
		(f(x) ? b : a).push(x)
	return [a, b]
}

const str2nospace = x => x.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')

const mdify = str => str
	?.replace(/_([^_]+)_/g, '<i>$1</i>')

const md = await Deno.readTextFile('resume.md')

/*
resume:
	{ links: [str]
	, name: str
	, sections:
		{ title: str
		, items:
			[{ title: str | null
			 , date: str | null
			 , tech: [str] | null
			 , description: str
			}]
		}
	}
*/

const resume = { links: [], sections: [] }
let level = 0

for (const line of md.replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2'>$1</a>").trim().split(/\n+/)) {
	let m = null
	if (m = line.match(/^# (.+)$/)) {
		level = 1
		resume.name = m[1]
	} else if (m = line.match(/^## (.+)$/)) {
		level = 2
		resume.sections.push({ title: m[1], items: [] })
	} else if (m = line.match(/^\* (.+?) ?(?:\{(.+)\})? ?(?:\<([Present\d- ]+)\>)?$/)) {
		if (level === 1) {
			if (m[1].startsWith('<a href')) { // bad hack oop?!
				resume.links.push(m[1])
			} else {
				resume.blurb = m[1]
			}
		} else if (level === 2) {
			resume.sections.last().items.push({
				title: m[1],
				tech: m[2]?.split(',').map(x => x.trim()),
				date: m[3],
			})
		}
	} else if (m = line.match(/\t- (.+)/)) {
		if (resume.sections.last().items.length === 0) { // special case
			resume.sections.last().items.push({})
		}
		const last = resume.sections.last().items.last()
		if (last.description) throw `item \`${last.title}\` already has description: ${last.description}`
		last.description = m[1]
	} else {
		console.error(level)
		throw line
	}
}

const opt = ([a, b], thing) => thing ? `${a}${thing}${b}` : ''

const item2html = ({ title, date, tech, description }) => `<div class=item>`
	+ opt`<div class=item-title>${mdify(title)}</div>`
	+ opt`<div class=lang>${tech?.join(', ')}</div>`
	+ opt`<div class=date>${date}</div>`
	+ `<blockquote class=detail>${mdify(description)}</blockquote>`
	+ `</div>`

const section2html = ({ title, items }) => {
	return `<div class=section><h2>${title}</h2>${items.map(item2html).join('')}</div>`
}

const is_right = ({ title }) => ({ 'Experience': true, 'Selected Projects': true, 'Languages, Other': true })[title]

const resume2html = ({ name, links, blurb, sections }) => {

	const [r, l] = sections.partition(is_right).map(ss => ss.map(section2html).join(''))

	const header = `<div id=header>`
		+ `<h1>${name}</h1>`
		+ `<div id=links>${links.map(x => `<span class=contact>${x}</span>`).join('')}</div>`
		+ `<div id=blurb>${blurb}</div>`
		+ `</div>`

	return `<meta name=viewport content='width=device-width, initial-scale=1'><title>James Huang's Resume</title><link href=style.css rel=stylesheet>`
		+ `<div class=column>${header}${r}</div>`
		+ `<div class=column>${l}</div>`
}

await Deno.writeTextFile('resume.html', resume2html(resume))

console.log('OK')
