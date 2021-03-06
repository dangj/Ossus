import React, { Component } from 'react';
import PropTypes from 'prop-types';
import remark from 'remark';
import reactRenderer from 'remark-react';
import frontmatter from 'remark-frontmatter';
import slug from 'remark-slug';
import outerToc from 'remark-outer-toc';
import externalLinks from 'remark-external-links';

import { wordCount, readTime } from './utils/readTime';

function headerDepth(header) {
  if (header[0] !== 'H') return -1;
  return header[1];
}

class MarkdownRenderer extends Component {
  state = {
    front: undefined,
    markdown: undefined
  };

  componentDidMount() {
    this.generateMarkdown();
    window.addEventListener('scroll', this.scrollSpy);
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.scrollSpy);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.content !== this.props.content) {
      this.generateMarkdown();
    }
  }

  setSpy = el => {
    if (this.spy) return;
    this.spy = el;
  };

  scrollSpy = e => {
    if (!this.spy) return;
    const children = Array.from(this.spy.children);
    //const boundary = headerDepth(children[0].tagName) > 0 ? 180 : 60; // magic number 🤭
    const headers = children.filter(el => headerDepth(el.tagName) > 0 && headerDepth(el.tagName) < 4).map(el => ({
      id: el.id,
      top: el.offsetTop + this.spy.offsetTop //+ boundary
    }));
    let top = e.target.scrollingElement.scrollTop;
    const above = headers.filter(head => head.top < top);
    if (above.length) {
      return this.props.watchScroll(above[above.length - 1].id);
    }
    this.props.watchScroll(this.state.front.title);
  };

  generateMarkdown = () => {
    const { content, menuCallback, frontCallback, components } = this.props;

    let front;
    const setFront = (x) => {
      front = x.children[0];
    };
    let menu;
    let read;
    const setMenu = (menu2) => { menu = menu2; };
    const md = remark()
      .use(frontmatter, ['yaml'])
      .use(() => setFront)
      .use(externalLinks)
      .use(slug)
      .use(reactRenderer, {
        remarkReactComponents: {
          ...components
        },
        sanitize: {
          clobberPrefix: '',
          attributes: {
            '*': ['id', 'className'],
            a: ['href', 'target', 'rel'],
            img: ['src']
          }
        }
      })
      .use(wordCount, {
        callback: (words) => {
          read = readTime(words);
        }
      })
      .use(outerToc, {
        callback: setMenu,
        id: true,
        depth: 3
      })
      .processSync(content);

    const frontObj = this.parseFrontMatter(front, read);
    this.setState({
      front: frontObj,
      markdown: md.contents,
    }, () => {
      frontCallback(frontObj);
      menuCallback(menu);
    });
  };

  parseFrontMatter = (front, readTime) => {
    if (!front) {
      return {};
    }
    const frontTitle = front.value.match(/title: ([^\n]+)/);
    const frontAuthor = front.value.match(/author: ([^\n]+)/);
    const frontUpdate = front.value.match(/last updated: ([^\n]+)/);
    return {
      ...frontTitle && { title: frontTitle[1] },
      ...frontAuthor && { author: frontAuthor[1] },
      ...frontUpdate && { update: frontUpdate[1] },
      ...readTime && { readTime }
    };
  };

  render() {
    const { markdown, front } = this.state;
    const { FrontMatter } = this.props;
    return (
      <>
        {FrontMatter && (
          <FrontMatter
            frontMatter={front}
          />
        )}
        {markdown && React.cloneElement(markdown, { ref: this.setSpy })}
      </>
    );
  }
}

MarkdownRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  menuCallback: PropTypes.func,
  frontCallback: PropTypes.func,
  watchScroll: PropTypes.func,
  components: PropTypes.object
};

MarkdownRenderer.defaultProps = {
  menuCallback: () => {},
  frontCallback: () => {},
  watchScroll: () => {},
  components: {}
};

export default MarkdownRenderer;