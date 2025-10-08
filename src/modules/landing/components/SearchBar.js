import React from "react";
import { Search } from "lucide-react";
import { Input } from "../../../components/common/Input";
import { Button } from "../../../components/common/Button";
import "../../../styles/components/searchBar.css";

export function SearchBar() {
  return (
    <div className="search-bar">
      <Search className="search-icon" />
      <Input
        type="text"
        placeholder="Tìm kiếm quán bar, DJ, sự kiện..."
        className="search-input"
      />
      <Button size="lg" className="search-button">
        Tìm kiếm
      </Button>
    </div>
  );
}
