"use client";
import { Navbar, Button, ButtonGroup, Container } from "react-bootstrap";
import { useRouter } from "next/navigation";
import authService, { AuthStatus } from "@services/auth.service";
import useAuth from "@components/UseAuth";
import LightDarkToggle from "./LightDarkToggle";
import ImportModal from "@components/Import/ImportModal";
import Export from "./Export";
import Image from "next/image";
import navbarView from "styles/navbar.module.scss";
import { useEffect, useState } from "react";
import api from "api/Api";
import { useBookmarkDispatch } from "@/contexts/BookmarkContext";
import Bookmark from "@type/Bookmarks/Bookmark";
import SearchType from "@type/classes/SearchType";

enum SearchTypeEnum {
  titleSearch,
  textSearch,
  tagSearch,
}

enum SearchTypeChar {
  b = SearchTypeEnum.titleSearch, // Title search (i.e. Bookmark Title)
  f = SearchTypeEnum.textSearch, // Full-text search.
  t = SearchTypeEnum.tagSearch, // Tag search.
}

const searchTypes = Object.values(SearchTypeEnum)
  .filter((v) => isNaN(Number(v)))
  .map((st, i) => {
    let type = String(st)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .split(" ")[0];
    let typeCased = type.charAt(0).toUpperCase() + String(type).slice(1);
    return new SearchType(i, SearchTypeChar[i], typeCased + " Search");
  });

const GlobalNavbar: React.FC = () => {
  const userAuth = useAuth();

  const [searchText, setSearchText] = useState("");
  const [modified, setModified] = useState(false);
  const [searchType, setSearchType] = useState(searchTypes[0]);
  const [shouldSplit, setShouldSplit] = useState(false);
  const [strTags, setStrTags] = useState<string[]>([]);
  const bkmkDispatch = useBookmarkDispatch();

  const router = useRouter();
  // TODO: Refactor into its own component.
  function authButton() {
    if (userAuth == AuthStatus.Unauthorized || userAuth === undefined) {
      return (
        <ButtonGroup>
          <Button
            variant="secondary"
            onClick={() => router.push("/account/login")}
          >
            Login
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push("/account/signup")}
          >
            Signup
          </Button>
        </ButtonGroup>
      );
    } else {
      return (
        <Button variant="secondary" onClick={handleLogoutClick}>
          Logout
        </Button>
      );
    }
  }
  const handleLogoutClick = () => {
    authService.logout();
    router.push("/account/login");
  };

  async function search(searchText: string, searchType: SearchTypeEnum) {
    let searchData: Bookmark[] = [];
    if (searchType == SearchTypeEnum.titleSearch) {
      await api
        .searchBookmarkByTitleKeywords(searchText.trim().replaceAll(" ", ","))
        .then((successResult) => {
          searchData = successResult.data as Bookmark[];
        });
    } else if (searchType == SearchTypeEnum.tagSearch && strTags.length) {
      await api
        .searchBookmarkByTags(strTags.join(","))
        .then((successResult) => {
          searchData = successResult.data as Bookmark[];
        });
    } else if (searchType == SearchTypeEnum.textSearch) {
      await api.searchBookmarkByText(searchText);
    }
    bkmkDispatch({
      type: "search",
      bookmarks: searchData,
    });
  }
  const handleSearch = (event: any) => {
    const rawSearch: string = event.target.value;
    let trimmed = rawSearch.trim();
    let search: string = "";

    if (trimmed.length > 1 && trimmed.startsWith("/")) {
      let sTypeChar: string | undefined = rawSearch.at(1);
      if (sTypeChar) {
        for (let i = 0; i < searchTypes.length; i++) {
          if (searchTypes[i].charCode == sTypeChar) {
            setSearchType(searchTypes[i]);
            break;
          }
        }
      }
      search = rawSearch.substring(2).trim();
      setModified(true);
    } else if (rawSearch.length) {
      search = rawSearch;
      setModified(true);
    } else {
      // setModified(false);
    }
    setSearchText(search);
  };

  useEffect(() => {
    // someone switched from tags to another type of search.
    if (searchType.type != SearchTypeEnum.tagSearch && strTags.length) {
      setSearchText(strTags.join(" "));
      setStrTags([]);
      search(strTags.join(" "), searchType.type);
    }
    // switched a text search to a tag search.
    else if (
      searchType.type == SearchTypeEnum.tagSearch &&
      shouldSplit &&
      searchText.length
    ) {
      setStrTags([...searchText.trimEnd().split(" ")]);
      // only split once.
      setShouldSplit(false);
      setSearchText("");
    }
    // No search parameters at all, bring back the defualt.
    else if (searchText.length == 0 && strTags.length == 0 && modified) {
      setModified(false);
      api.getAllBookmarks().then((successResult) => {
        bkmkDispatch({
          type: "search",
          bookmarks: successResult.data as Bookmark[],
        });
      });
    }
    // otherwise just search.
    else if (searchText.length || strTags.length) {
      search(searchText, searchType.type);
    }
  }, [modified, searchText, searchType, strTags]);

  const deleteTag = (index: number) => {
    const tags = strTags.filter((t, i) => i !== index);
    setStrTags(tags);
  };

  function onKeyDown(e: any) {
    if (searchType.type == SearchTypeEnum.tagSearch) {
      const { keyCode } = e;
      const trimmedInput = searchText.trim();
      if (
        // add tag via space bar or enter
        (keyCode === 32 || keyCode === 13) &&
        trimmedInput.length &&
        !strTags.includes(trimmedInput)
      ) {
        setStrTags((prevState) => [...prevState, trimmedInput]);
        setSearchText("");
      }
      // user hits backspace and the user has input field of 0
      // then pop the last tag only if there is one.
      if (keyCode === 8 && !searchText.length && strTags.length) {
        e.preventDefault();
        const tagsCopy = [...strTags];
        let poppedTag = tagsCopy.pop();
        setStrTags(tagsCopy);
        setSearchText(poppedTag ? poppedTag : "");
      }
    }
  }

  return (
    <Navbar
      expand="lg"
      style={{ borderBottom: "1px solid", height: "60px" }}
      className="bg-body-tertiary"
    >
      <Container className={`${navbarView.navContainer}`}>
        <Navbar.Brand
          onClick={() => router.push("/")}
          className={`mx-3 cursor-pointer ${navbarView.navBrand}`}
        >
          <Image
            src="/basic-f-v2-dark-mode-v2-fav.png"
            width="38"
            height="30"
            className="d-inline-block align-top"
            alt="Find First logo"
          />
          FindFirst
        </Navbar.Brand>
        {userAuth === AuthStatus.Authorized ? (
          <div className={`d-flex flex-grow-1 mx-3 ${navbarView.searchBar}`}>
            <button
              key={"searchType"}
              title={searchType.textDescription}
              onClick={() => {
                const nextType = (searchType.type + 1) % 3;
                if (searchText.length && nextType == SearchTypeEnum.tagSearch) {
                  setShouldSplit(true);
                } else {
                  setShouldSplit(false);
                }
                setSearchType(searchTypes[nextType]);
              }}
              type="button"
              data-testid={searchType + "searchType"}
              className={navbarView.pillButton}
            >
              {`/${searchType.charCode}`}
            </button>
            {searchType.type == SearchTypeEnum.tagSearch
              ? strTags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => deleteTag(index)}
                    type="button"
                    data-testid={tag}
                    className={navbarView.pillButtonTag}
                  >
                    {tag}
                    <i className="xtag bi bi-x"></i>
                  </button>
                ))
              : null}
            <input
              type="text"
              className={`${navbarView.searchBarInput}`}
              placeholder="Search"
              onKeyDown={(e) => onKeyDown(e)}
              onChange={handleSearch}
              value={searchText}
            />
            <button
              className={`btn ms-2 ${navbarView.searchBarBtn}`}
              type="submit"
            >
              <i className="bi bi-search"></i>
            </button>
          </div>
        ) : null}
        <div className={`mx-3 ${navbarView.navBtns}`}>
          {userAuth === AuthStatus.Authorized ? (
            <ImportModal
              file={undefined}
              show={false}
              data-testid="import-modal"
            />
          ) : null}
          {userAuth === AuthStatus.Authorized ? (
            <Export data-testid="export-component" />
          ) : null}
          <LightDarkToggle />
          {authButton()}
        </div>
      </Container>
    </Navbar>
  );
};

export default GlobalNavbar;
